export function load() { }
export function unload() { }
let _originalConsoleError: (...data: unknown[]) => void = () => { };
let _caughtLogs: string[] = [];

export const methods = {
    async startCatchLogging() {
        _caughtLogs = [];
        _originalConsoleError = console.error;
        console.error = (...data: unknown[]) => {
            const msg = data.map(a => a instanceof Error ? a.message : a).join(' ');
            _caughtLogs.push(msg);
            _originalConsoleError(...data);
        }
    },

    async stopCatchLogging(): Promise<string[]> {
        console.error = _originalConsoleError;
        return _caughtLogs;
    },

    async createPrefabFromNode(nodeUuid: string, path: string): Promise<string> {
        const cce = (globalThis as any)['cce'];
        
        if (!cce || !cce.Prefab || !cce.Prefab.createPrefabAssetFromNode) {
            throw new Error('CCE API not found');
        }

        return await cce.Prefab.createPrefabAssetFromNode(nodeUuid, path);
    },

    async applyPrefabByNode(nodeUuid: string): Promise<string | null> {
        try {
            const cce = (globalThis as any)['cce'];
            if (!cce || !cce.Prefab || !cce.Prefab.applyPrefab) {
                throw new Error('CCE API not found');
            }

            const success: boolean = await cce.Prefab.applyPrefab(nodeUuid);
            if (!success) {
                throw new Error('Failed to apply prefab');
            } else {
                return null;
            }
        } catch (error) {
            return error instanceof Error ? error.message : String(error);
        }
    },

    async unlinkPrefabByNode(nodeUuid: string, recursive: boolean): Promise<string | null> {
        try {
            const cce = (globalThis as any)['cce'];
            if (!cce || !cce.Prefab || !cce.Prefab.unWrapPrefabInstance) {
                throw new Error('CCE API not found');
            }

            const success: boolean = await cce.Prefab.unWrapPrefabInstance(nodeUuid, recursive);
            if (!success) {
                throw new Error('Failed to unlink prefab');
            } else {
                return null;
            }
        } catch (error) {
             return error instanceof Error ? error.message : String(error);
        }
    },

};
