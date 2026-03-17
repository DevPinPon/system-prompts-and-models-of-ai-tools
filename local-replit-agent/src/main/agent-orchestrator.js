const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const AGENT_SYSTEM_PROMPT = `You are Local Replit Agent — an autonomous AI programming assistant running on the user's local machine.
You have full access to the project workspace, terminal, and deployment tools.

Your capabilities:
1. **File Operations**: Create, read, edit, and delete files in the project workspace.
2. **Shell Commands**: Execute any shell command in the project directory.
3. **Package Management**: Install/uninstall packages for any language (npm, pip, cargo, etc.).
4. **Database Operations**: Create and manage PostgreSQL databases via Docker.
5. **Deployment**: Deploy applications to Google Cloud Run with containerized builds.
6. **Web Preview**: Start dev servers and preview applications.

Your workflow for building applications:
1. **Understand**: Analyze the user's request thoroughly.
2. **Plan**: Break down the task into clear, ordered steps.
3. **Execute**: Implement each step — create files, install deps, write code.
4. **Test**: Run the application to verify it works.
5. **Iterate**: Fix any issues found during testing.
6. **Deploy**: When ready, deploy to Google Cloud if requested.

Rules:
- Always explain what you're doing before making changes.
- Use existing code patterns when they exist.
- Install dependencies before writing code that uses them.
- Start dev servers after making changes to verify they work.
- Handle errors gracefully and provide clear error messages.
- Write production-quality code — proper error handling, security, performance.
- When editing files, be precise — only change what needs changing.

You respond with tool calls to perform actions. Available tools are provided in the tools array.`;

class AgentOrchestrator {
  constructor(store) {
    this.store = store;
    this.client = null;
    this.abortController = null;
    this.conversationHistory = [];
    this.activeTaskId = null;
  }

  _getClient() {
    const apiKey = this.store.get('claudeApiKey');
    if (!apiKey) throw new Error('Claude API key not configured. Go to Settings to add it.');
    if (!this.client || this._lastApiKey !== apiKey) {
      this.client = new Anthropic({ apiKey });
      this._lastApiKey = apiKey;
    }
    return this.client;
  }

  _getTools() {
    return [
      {
        name: 'create_file',
        description: 'Create a new file or overwrite an existing file with the given content.',
        input_schema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Relative path from the project root' },
            content: { type: 'string', description: 'The file content to write' },
          },
          required: ['file_path', 'content'],
        },
      },
      {
        name: 'edit_file',
        description: 'Edit an existing file by replacing a specific string with new content. The old_str must be an exact match of existing content.',
        input_schema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Relative path from the project root' },
            old_str: { type: 'string', description: 'Exact string to find and replace' },
            new_str: { type: 'string', description: 'Replacement string' },
          },
          required: ['file_path', 'old_str', 'new_str'],
        },
      },
      {
        name: 'read_file',
        description: 'Read the contents of a file.',
        input_schema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Relative path from the project root' },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'list_directory',
        description: 'List files and directories at the given path.',
        input_schema: {
          type: 'object',
          properties: {
            dir_path: { type: 'string', description: 'Relative path from the project root (use "." for root)' },
          },
          required: ['dir_path'],
        },
      },
      {
        name: 'run_shell_command',
        description: 'Execute a shell command in the project directory. Use for installing packages, running scripts, starting servers, git operations, etc.',
        input_schema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'The shell command to execute' },
            background: { type: 'boolean', description: 'Run in background (for servers)', default: false },
          },
          required: ['command'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for text content across all files in the project.',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query string' },
            file_pattern: { type: 'string', description: 'Optional glob pattern to filter files (e.g., "*.js")' },
          },
          required: ['query'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file or directory.',
        input_schema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Relative path from the project root' },
          },
          required: ['file_path'],
        },
      },
      {
        name: 'report_progress',
        description: 'Report progress on the current task to the user with a summary of completed and pending items.',
        input_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: 'Concise summary of progress (max 5 items)' },
            status: { type: 'string', enum: ['in_progress', 'completed', 'error'], description: 'Current task status' },
          },
          required: ['summary', 'status'],
        },
      },
    ];
  }

  async _executeTool(toolName, toolInput, projectPath, emitEvent) {
    const resolve = (p) => path.resolve(projectPath, p);

    switch (toolName) {
      case 'create_file': {
        const filePath = resolve(toolInput.file_path);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, toolInput.content, 'utf-8');
        emitEvent({ type: 'file_created', path: toolInput.file_path });
        return `File created: ${toolInput.file_path}`;
      }

      case 'edit_file': {
        const filePath = resolve(toolInput.file_path);
        if (!fs.existsSync(filePath)) return `Error: File not found: ${toolInput.file_path}`;
        let content = fs.readFileSync(filePath, 'utf-8');
        if (!content.includes(toolInput.old_str)) {
          return `Error: Could not find the specified text in ${toolInput.file_path}. Make sure old_str matches exactly.`;
        }
        content = content.replace(toolInput.old_str, toolInput.new_str);
        fs.writeFileSync(filePath, content, 'utf-8');
        emitEvent({ type: 'file_edited', path: toolInput.file_path });
        return `File edited: ${toolInput.file_path}`;
      }

      case 'read_file': {
        const filePath = resolve(toolInput.file_path);
        if (!fs.existsSync(filePath)) return `Error: File not found: ${toolInput.file_path}`;
        return fs.readFileSync(filePath, 'utf-8');
      }

      case 'list_directory': {
        const dirPath = resolve(toolInput.dir_path);
        if (!fs.existsSync(dirPath)) return `Error: Directory not found: ${toolInput.dir_path}`;
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        return items
          .filter(i => !i.name.startsWith('.') && i.name !== 'node_modules')
          .map(i => `${i.isDirectory() ? '[DIR]' : '[FILE]'} ${i.name}`)
          .join('\n');
      }

      case 'run_shell_command': {
        emitEvent({ type: 'command_start', command: toolInput.command });
        return new Promise((resolvePromise) => {
          const options = { cwd: projectPath, timeout: 60000, maxBuffer: 1024 * 1024 * 10 };
          if (toolInput.background) {
            exec(`${toolInput.command} &`, options);
            resolvePromise(`Background command started: ${toolInput.command}`);
            return;
          }
          exec(toolInput.command, options, (error, stdout, stderr) => {
            const output = (stdout || '') + (stderr ? `\nSTDERR: ${stderr}` : '');
            emitEvent({ type: 'command_complete', command: toolInput.command, output, error: error?.message });
            resolvePromise(error ? `Error: ${error.message}\n${output}` : output || 'Command completed successfully.');
          });
        });
      }

      case 'search_files': {
        const results = [];
        const searchDir = (dir) => {
          try {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
              if (['node_modules', '.git', '__pycache__', 'dist', 'build'].includes(item.name)) continue;
              const fullPath = path.join(dir, item.name);
              if (item.isDirectory()) {
                searchDir(fullPath);
              } else {
                try {
                  const content = fs.readFileSync(fullPath, 'utf-8');
                  const lines = content.split('\n');
                  lines.forEach((line, i) => {
                    if (line.includes(toolInput.query)) {
                      results.push(`${path.relative(projectPath, fullPath)}:${i + 1}: ${line.trim()}`);
                    }
                  });
                } catch { /* binary file */ }
              }
            }
          } catch { /* permission error */ }
        };
        searchDir(projectPath);
        return results.length > 0 ? results.slice(0, 50).join('\n') : 'No matches found.';
      }

      case 'delete_file': {
        const filePath = resolve(toolInput.file_path);
        if (!fs.existsSync(filePath)) return `Error: Not found: ${toolInput.file_path}`;
        fs.rmSync(filePath, { recursive: true, force: true });
        emitEvent({ type: 'file_deleted', path: toolInput.file_path });
        return `Deleted: ${toolInput.file_path}`;
      }

      case 'report_progress': {
        emitEvent({ type: 'progress', summary: toolInput.summary, status: toolInput.status });
        return 'Progress reported to user.';
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  }

  async chat(userMessage, projectPath, existingHistory = [], emitEvent) {
    const client = this._getClient();
    this.abortController = new AbortController();
    const taskId = uuidv4();
    this.activeTaskId = taskId;

    // Build conversation
    const messages = [...existingHistory, { role: 'user', content: userMessage }];

    emitEvent({ type: 'thinking', message: 'Analyzing your request...' });

    try {
      // Agentic loop: keep calling Claude until no more tool_use
      let response = await client.messages.create({
        model: this.store.get('claudeModel'),
        max_tokens: this.store.get('maxTokens'),
        system: AGENT_SYSTEM_PROMPT,
        tools: this._getTools(),
        messages,
      });

      messages.push({ role: 'assistant', content: response.content });

      while (response.stop_reason === 'tool_use') {
        if (this.activeTaskId !== taskId) break; // stopped

        const toolBlocks = response.content.filter(b => b.type === 'tool_use');
        const toolResults = [];

        for (const toolBlock of toolBlocks) {
          emitEvent({
            type: 'tool_call',
            tool: toolBlock.name,
            input: toolBlock.input,
          });

          const result = await this._executeTool(
            toolBlock.name,
            toolBlock.input,
            projectPath,
            emitEvent
          );

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: typeof result === 'string' ? result : JSON.stringify(result),
          });
        }

        messages.push({ role: 'user', content: toolResults });

        response = await client.messages.create({
          model: this.store.get('claudeModel'),
          max_tokens: this.store.get('maxTokens'),
          system: AGENT_SYSTEM_PROMPT,
          tools: this._getTools(),
          messages,
        });

        messages.push({ role: 'assistant', content: response.content });
      }

      // Extract text response
      const textBlocks = response.content.filter(b => b.type === 'text');
      const finalText = textBlocks.map(b => b.text).join('\n');

      emitEvent({ type: 'complete', message: finalText });

      return {
        response: finalText,
        messages,
        usage: response.usage,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        emitEvent({ type: 'stopped', message: 'Agent stopped by user.' });
        return { response: 'Agent stopped.', messages, usage: null };
      }
      emitEvent({ type: 'error', message: error.message });
      throw error;
    }
  }

  async planAndExecute(task, projectPath, emitEvent) {
    const planPrompt = `I need you to autonomously build the following:

${task}

Follow this process:
1. First, list the files in the project to understand the current state.
2. Create a detailed plan with numbered steps.
3. Execute each step one by one — create files, install packages, write code.
4. After writing all the code, run the application to test it.
5. Fix any errors that come up.
6. Report your progress when done.

Be thorough and autonomous. Build the complete, working application.`;

    return this.chat(planPrompt, projectPath, [], emitEvent);
  }

  stop() {
    this.activeTaskId = null;
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

module.exports = { AgentOrchestrator };
