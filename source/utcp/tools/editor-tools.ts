import { utcpTool } from '../decorators';
import * as fs from 'fs';
import * as path from 'path';
import { ISuccessIndicator, SuccessIndicatorSchema } from '../schemas';

export class EditorTools {

    @utcpTool(
        'editorOperate',
        'Common editor operations for scene and prefab view, game preview controls and asset database refresh',
        {
            type: 'object',
            properties: {
                operation: { type: 'string', enum: ['save_scene_or_prefab', 'close_scene_or_prefab', 'play_preview', 'pause', 'step', 'stop', 'refresh'] }
            },
            required: ['operation']
        },
        SuccessIndicatorSchema, "POST",  ['operation', 'editor', 'scene', 'prefab', 'preview', 'asset', 'refresh']
    )
    async editorOperate(args: { operation: string }): Promise<ISuccessIndicator> {
        switch (args.operation) {
            case 'save_scene_or_prefab':
                await Editor.Message.request('scene', 'save-scene');
                return { success: true };
            case 'close_scene_or_prefab':
                await Editor.Message.request('scene', 'close-scene');
                return { success: true };
            case 'play_preview':
                await Editor.Message.request('scene', 'editor-preview-set-play', true);
                return { success: true };
            case 'pause':
                await Editor.Message.request('scene', 'editor-preview-call-method', 'pause', true);
                return { success: true };
            case 'step':
                 await Editor.Message.request('scene', 'editor-preview-call-method', 'step');
                return { success: true };
            case 'stop':
                await Editor.Message.request('scene', 'editor-preview-set-play', false);
                return { success: true };
            case 'refresh':
                await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets');
                return { success: true };
            default:
                throw new Error(`Unknown operation: ${args.operation}`);
        }
    }

    @utcpTool(
        'editorGetLogs',
        'Get last N editor log entries',
        {
            type: 'object',
            properties: {
                count: { type: 'number', description: 'Number of log entries to retrieve', default: 10 },
                showStack: { type: 'boolean', description: 'Return full stack trace for each log entry' },
                order: { type: 'string', enum: ['newest-to-oldest', 'oldest-to-newest'], description: 'Order of logs', default: 'newest-to-oldest' }
            },
            required: ['count', 'order']
        },
        { type: 'object', properties: { logLines: { type: 'array', items: { type: 'string' } } }, required: ['logLines'] }, "GET",  ['editor', 'logs', 'debug', 'info']
    )
    async editorGetLogs(args: { count: number, showStack: boolean, order: 'newest-to-oldest' | 'oldest-to-newest' }): Promise<{ logLines: string[] }> {
        const projectPath = Editor.Project.path;
        const logPath = path.join(projectPath, 'temp', 'logs', 'project.log');

        if (args.showStack === undefined) {
            args.showStack = false;
        }

        if (!fs.existsSync(logPath)) {
            throw new Error(`Log file not found at ${logPath}`);
        }

        const entries: string[] = [];
        const fd = fs.openSync(logPath, 'r');
        
        try {
            const stats = fs.fstatSync(fd);
            const fileSize = stats.size;
            const bufferSize = 10 * 1024; // 10KB chunks
            const buffer = Buffer.alloc(bufferSize);
            
            let position = fileSize;
            let leftover = '';
            let accumulatedBody = ''; // Text belonging to the current (bottom-most) entry being parsed
            
            const regex = /^(\d{1,2}-\d{1,2}-\d{4}\s\d{2}:\d{2}:\d{2}\s-\s(?:log|warn|error|info):\s)/;
            const timestampRegex = /^\d{1,2}-\d{1,2}-\d{4}\s\d{2}:\d{2}:\d{2}\s-\s/;
            
            let lastContent: string | null = null;
            let lastCount = 0;

            while (position > 0 && entries.length < args.count) {
                const readSize = Math.min(bufferSize, position);
                const readPos = position - readSize;
                
                fs.readSync(fd, buffer, 0, readSize, readPos);
                position -= readSize;
                
                const chunk = buffer.toString('utf-8', 0, readSize);
                const combined = chunk + leftover;
                
                // Split by newline
                const lines = combined.split(/\r?\n/);
                
                if (position > 0) {
                    leftover = lines.shift() || '';
                } else {
                    leftover = ''; // Process all
                }

                // Process lines in reverse (bottom to top of the chunk)
                for (let i = lines.length - 1; i >= 0; i--) {
                    const line = lines[i];
                    
                    // Check if this line is a Header (Start of Entry)
                    if (regex.test(line)) {
                        let entry = line;
                        if (args.showStack && accumulatedBody.length > 0) {
                            entry += '\n' + accumulatedBody;
                        }
                        
                        const cleaned = entry.replace(timestampRegex, '');
                        
                        if (cleaned === lastContent) {
                            lastCount++;
                            entries[entries.length - 1] = `(${lastCount}) ${cleaned}`;
                        } else {
                            if (entries.length >= args.count) {
                                // Found a new group but we already have enough
                                position = 0; // Stop reading file loop
                                break; // Stop lines loop
                            }
                            lastContent = cleaned;
                            lastCount = 1;
                            entries.push(cleaned);
                        }
                        
                        accumulatedBody = ''; // Reset for the next entry (upwards)
                    } else {
                        // This identifies as body text (or empty line) belonging to the entry "above" it
                        if (args.showStack && accumulatedBody.length > 0) {
                            accumulatedBody = line + '\n' + accumulatedBody;
                        } else {
                            accumulatedBody = line;
                        }
                    }
                }
            }
            
        } finally {
            fs.closeSync(fd);
        }

        // We pushed entries in reverse order (newest first).
        if (args.order === 'oldest-to-newest') {
             return { logLines: entries.reverse() };
        } 
        
        return { logLines: entries };
    }

}
