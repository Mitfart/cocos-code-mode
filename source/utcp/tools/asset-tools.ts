import fs from 'fs-extra';
import { utcpTool } from '../decorators';
import { AssetInfo, AssetOperationOption } from '@cocos/creator-types/editor/packages/asset-db/@types/public';
import { AssetTreeItemSchema, IAssetTreeItem, InstanceReferenceSchema, IInstanceReference } from '../schemas';
import path, { basename, extname } from 'path';
import os from 'os';

function normalizePath(p?: string): string {
    if (!p) return 'db://assets';
    let path = p.replace(/\\/g, '/').trim();

    // Handle db:// protocol
    if (path.startsWith('db://')) {
        return path.endsWith('/') && path !== 'db://' ? path.slice(0, -1) : path;
    }

    // Remove leading slash
    if (path.startsWith('/')) {
        path = path.slice(1);
    }

    // Handle root aliases
    if (path === '' || path === 'assets') {
        return 'db://assets';
    }

    // Handle 'assets/' prefix
    if (path.startsWith('assets/')) {
        const result = 'db://' + path;
        return result.endsWith('/') ? result.slice(0, -1) : result;
    }

    // Treat as relative path under assets
    if (path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    return `db://assets/${path}`;
}

export class AssetTools {

    @utcpTool(
        'assetGetTree',
        'Get the asset and subAsset hierarchy tree. Children have recursive structure.',
        {
            type: 'object',
            properties: {
                reference: InstanceReferenceSchema,
                assetPath: { type: 'string', description: 'Root path to start from' }
            }
        },
        AssetTreeItemSchema, "GET", ['asset', 'file', 'tree', 'hierarchy', 'folder', 'subasset']
    )
    async assetGetTree(args: { reference?: IInstanceReference, assetPath?: string }): Promise<IAssetTreeItem> {
        if (args.reference) {
            const info = await Editor.Message.request('asset-db', 'query-asset-info', args.reference.id);
            if (!info) {
                throw new Error(`Asset with UUID ${args.reference.id} not found.`);
            }
            args.assetPath = info.url;
        }

        let rootPath = normalizePath(args.assetPath);

        const pattern = `${rootPath}/**`;
        const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern });
        const rootUuid = await Editor.Message.request('asset-db', 'query-uuid', rootPath);

        const assetsMap = new Map<string, IAssetTreeItem>();

        // Create Root Node first
        const rootName = rootPath.split('/').pop() || 'assets';
        const rootNode: IAssetTreeItem = {
            filesystemPath: Editor.Project.path + '/' + rootPath.replace('db://', ''),
            reference: { id: rootUuid || 'root', type: 'folder' },
            name: rootName,
            children: []
        };
        assetsMap.set(rootPath, rootNode);

        // First pass: Map assets
        assets.forEach((asset: any) => {
            if (asset.url === rootPath) return; // Skip root, already created

            const type = asset.isDirectory ? 'folder' : asset.type;

            const treeItem: IAssetTreeItem = {
                reference: { id: asset.uuid, type: type },
                name: asset.name,
                children: []
            };

            assetsMap.set(asset.url, treeItem);
        });

        // Second pass: Build hierarchy
        assets.forEach((asset: any) => {
            if (asset.url === rootPath) return;

            const treeItem = assetsMap.get(asset.url);
            if (!treeItem) return;

            const parentUrl = asset.url.substring(0, asset.url.lastIndexOf('/'));
            const parentItem = assetsMap.get(parentUrl);

            if (parentItem) {
                parentItem.children.push(treeItem);
            }
        });

        return rootNode;
    }

    @utcpTool(
        'assetGetAtPath',
        'Get asset reference by given local path and name, including extension. Can be used for subassets too. Returns reference to the asset.',
        {
            type: 'object',
            properties: {
                assetPath: { type: 'string' }
            },
            required: ['assetPath']
        },
        { type: 'object', properties: { reference: InstanceReferenceSchema }, required: ['reference'] }, "GET", ['asset', 'get', 'path', 'look', 'find']
    )
    async assetGetAtPath(args: { assetPath: string }): Promise<{ reference: IInstanceReference }> {
        let targetPath = normalizePath(args.assetPath);

        console.log(`Looking for asset at path: ${targetPath}`);

        const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', targetPath);
        if (!assetInfo) {
            throw new Error(`Asset not found at path: ${targetPath}`);
        } else {
            return { reference: { id: assetInfo.uuid, type: assetInfo.type } };
        }
    }

    @utcpTool(
        'assetCreate',
        'Create empty asset or folder of given type. Automatically handles folders creation along the path. Returns reference to the new asset.',
        {
            type: 'object',
            properties: {
                assetPath: { type: 'string' },
                preset: {
                    type: 'string',
                    enum: [
                        'folder',
                        'material',
                        'effect',
                        'scene',
                        'prefab',
                        'typescript',
                        'animation-clip',
                        'render-texture',
                        'physics-material',
                        'animation-graph',
                        'animation-graph-variant',
                        'animation-mask',
                        'auto-atlas',
                        'effect-header',
                        'label-atlas',
                        'terrain'
                    ],
                    description: 'Preset type for the new asset'
                },
                options: { type: 'object', properties: { overwrite: { type: 'boolean' }, rename: { type: 'boolean' } }, description: 'Additional options for the operation', nullable: true },
            },
            required: ['assetPath', 'preset']
        },
        { type: 'object', properties: { reference: InstanceReferenceSchema }, required: ['reference'] }, "POST", ['asset', 'create', 'new', 'preset', 'folder', 'typescript']
    )
    async assetCreate(args: { assetPath: string; preset: string; options?: { overwrite?: boolean, rename?: boolean } }): Promise<{ reference: IInstanceReference }> {
        let targetPath = normalizePath(args.assetPath);

        // Map 'preset' from schema to 'type' expected by function
        const type = args.preset;
        const presetMap: Record<string, string> = {
            'material': 'db://internal/default_file_content/material/default.mtl',
            'effect': 'db://internal/default_file_content/effect/default.effect',
            'scene': 'db://internal/default_file_content/scene/default.scene',
            'prefab': 'db://internal/default_file_content/prefab/default.prefab',
            'animation-clip': 'db://internal/default_file_content/animation-clip/default.anim',
            'render-texture': 'db://internal/default_file_content/render-texture/default.rt',
            'physics-material': 'db://internal/default_file_content/physics-material/default.pmtl',
            'animation-graph': 'db://internal/default_file_content/animation-graph/default.animgraph',
            'animation-graph-variant': 'db://internal/default_file_content/animation-graph-variant/default.animgraphvari',
            'animation-mask': 'db://internal/default_file_content/animation-mask/default.animask',
            'auto-atlas': 'db://internal/default_file_content/auto-atlas/default.pac',
            'effect-header': 'db://internal/default_file_content/effect-header/chunk',
            'label-atlas': 'db://internal/default_file_content/label-atlas/default.labelatlas',
            'terrain': 'db://internal/default_file_content/terrain/default.terrain'
        };

        const assetOptions: AssetOperationOption = {
            overwrite: args.options?.overwrite ?? false,
            rename: args.options?.rename ?? false
        };

        if (type === 'folder' || type === 'typescript') {
            let content: string | null = null;
            if (type === 'typescript') {
                const currentExtName = extname(targetPath);
                if (currentExtName !== '.ts') {
                    targetPath = currentExtName ? targetPath.slice(0, -currentExtName.length) : targetPath;
                    targetPath += '.ts';
                }
                const className = basename(targetPath.slice('db://'.length), '.ts');
                content = this.generateTypescriptClassTemplate(className);
            }

            const result = await Editor.Message.request('asset-db', 'create-asset', targetPath, content, assetOptions);
            if (!result) {
                throw new Error(`Failed to create folder at ${targetPath}`);
            } else {
                return { reference: { id: result.uuid, type: type } };
            }
        }

        const source = presetMap[type];
        if (!source) {
            throw new Error(`Unknown asset preset type: ${type}`);
        }

        if (extname(targetPath) === '' && type !== 'folder') {
            targetPath += type == 'chunk' ? '.chunk' : extname(presetMap[type]);
        }

        const assetInfo = await Editor.Message.request('asset-db', 'copy-asset', source, targetPath, assetOptions);
        if (!assetInfo) {
            throw new Error(`Failed to create asset at ${targetPath}`);
        } else {
            return { reference: { id: assetInfo.uuid, type: assetInfo.type } };
        }
    }

    @utcpTool(
        'assetImport',
        'Import an external file as an asset into the project. Path must end with the extension. Returns reference to the new asset.',
        {
            type: 'object',
            properties: {
                sourceFilesystemPath: { type: 'string', description: 'Source filesystem path of the file to import' },
                targetAssetPath: { type: 'string', description: 'Target path in the asset database' },
                imageType: { type: 'string', enum: ['raw', 'texture', 'normal-map', 'sprite-frame', 'texture-cube'], description: 'For image files, specify how to import them' },
                options: { type: 'object', properties: { overwrite: { type: 'boolean' }, rename: { type: 'boolean' } }, description: 'Additional options for the operation' },
            },
            required: ['sourceFilesystemPath', 'targetAssetPath']
        },
        { type: 'object', properties: { reference: InstanceReferenceSchema }, required: ['reference'] }, "POST", ['asset', 'import', 'file', 'external', 'image']
    )
    async assetImport(args: { sourceFilesystemPath: string, targetAssetPath: string, imageType?: 'raw' | 'texture' | 'normal-map' | 'sprite-frame' | 'texture-cube', options?: { overwrite?: boolean, rename?: boolean } }): Promise<{ reference: IInstanceReference }> {
        let targetPath = normalizePath(args.targetAssetPath);

        const assetOptions: AssetOperationOption = {
            overwrite: args.options?.overwrite ?? false,
            rename: args.options?.rename ?? false
        };

        // Additional resolving for absolute path
        if (args.sourceFilesystemPath.startsWith('~')) {
            args.sourceFilesystemPath = path.join(os.homedir(), args.sourceFilesystemPath.slice(1));
        }
        args.sourceFilesystemPath = path.resolve(args.sourceFilesystemPath);
        args.sourceFilesystemPath = await fs.realpath(args.sourceFilesystemPath);

        // Checking for existing asset at target path
        let existingAssetInfo: AssetInfo | null = null;
        // If caller tries to import the same file in assets - just reimport
        if (`${Editor.Project.path}${targetPath.slice('db:/'.length)}` === args.sourceFilesystemPath) {
            await Editor.Message.request('asset-db', 'refresh-asset', targetPath);
            existingAssetInfo = await Editor.Message.request('asset-db', 'query-asset-info', targetPath);
        }

        const assetInfo = existingAssetInfo ? existingAssetInfo :
            await Editor.Message.request('asset-db', 'import-asset', args.sourceFilesystemPath, targetPath, assetOptions);
        if (!assetInfo) {
            throw new Error(`Failed to import asset to ${targetPath}`);
        } else {
            if (assetInfo.extends && assetInfo.importer === 'image' && args.imageType) {
                // Handle image type override
                const meta = await Editor.Message.request('asset-db', 'query-asset-meta', assetInfo.uuid);
                if (meta && meta.userData) {
                    let typeToSet: string = args.imageType;
                    if (typeToSet === 'normal-map') {
                        typeToSet = 'normal map';
                    }
                    if (typeToSet === 'texture-cube') {
                        typeToSet = 'texture cube';
                    }
                    meta.userData.type = typeToSet;
                    await Editor.Message.request('asset-db', 'save-asset-meta', assetInfo.uuid, JSON.stringify(meta));
                }
            }

            return { reference: { id: assetInfo.uuid, type: assetInfo.type } };
        }
    }

    @utcpTool(
        'assetOperate',
        'Perform operations on assets (move, copy, delete, open). Returns reference to the affected asset (for delete/open returns the source asset reference).',
        {
            type: 'object',
            properties: {
                operation: { type: 'string', enum: ['move', 'copy', 'delete', 'open', 'refresh', 'reimport'] },
                reference: InstanceReferenceSchema,
                targetAssetPath: { type: 'string', description: 'Target path (for move/copy/import)' },
                options: { type: 'object', properties: { overwrite: { type: 'boolean' }, rename: { type: 'boolean' } }, description: 'Additional options for the operation', nullable: true },
            },
            required: ['operation', 'reference']
        },
        { type: 'object', properties: { reference: InstanceReferenceSchema }, required: ['reference'] }, "POST", ['asset', 'operate', 'move', 'copy', 'delete', 'open', 'refresh', 'reimport']
    )
    async assetOperate(args: { operation: string, reference: IInstanceReference, targetAssetPath?: string, options?: { overwrite?: boolean, rename?: boolean } }): Promise<{ reference: IInstanceReference }> {
        const assetOptions = {
            overwrite: args.options?.overwrite ?? false,
            rename: args.options?.rename ?? false
        };

        args.targetAssetPath = normalizePath(args.targetAssetPath);
        let result: AssetInfo | null = null;

        switch (args.operation) {
            case 'move':
                if (!args.targetAssetPath) {
                    throw new Error('Target is required for move');
                }

                result = await Editor.Message.request('asset-db', 'move-asset', args.reference.id, args.targetAssetPath, assetOptions);
                break;

            case 'copy':
                if (!args.targetAssetPath) {
                    throw new Error('Target is required for copy');
                }
                result = await Editor.Message.request('asset-db', 'copy-asset', args.reference.id, args.targetAssetPath, assetOptions);
                break;

            case 'delete':
                result = await Editor.Message.request('asset-db', 'delete-asset', args.reference.id);
                break;

            case 'open':
                await Editor.Message.request('asset-db', 'open-asset', args.reference.id);
                result = null;
                break;

            case 'refresh':
                await Editor.Message.request('asset-db', 'refresh-asset', args.reference.id);
                result = null;
                break;
            case 'reimport':
                await Editor.Message.request('asset-db', 'reimport-asset', args.reference.id);
                result = null;
                break;
            default:
                throw new Error(`Unknown operation: ${args.operation}`);
        }

        return { reference: { id: result?.uuid ?? '', type: result?.type ?? '' } };
    }


    private generateTypescriptClassTemplate(className: string): string {
        return `import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('${className}')
export class ${className} extends Component {
    start() {

    }

    update(deltaTime: number) {
        
    }
}`;
    }
}