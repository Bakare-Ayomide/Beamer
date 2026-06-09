/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Filesystem, Directory } from '@capacitor/filesystem';

export interface ExplorerFile {
  id: string;
  name: string;
  size: number;
  category: 'videos' | 'photos' | 'audios' | 'documents' | 'files' | 'apps';
  detail: string; 
  extension: string;
  senderBlobUrl?: string; // Direct downloadable/playable URL
  rawText?: string;      // Content of document/text files
  iconName?: string;     // Specific icon name for APK/Apps
}

export const CATEGORY_LABELS = {
  videos: 'Videos',
  photos: 'Photos',
  audios: 'Audios',
  documents: 'Documents',
  files: 'Files',
  apps: 'Apps',
};

// Traverse directories recursively using Capacitor Filesystem Plugin for Native Android builds
export async function scanCapacitorDirectory(path: string, directory: Directory): Promise<ExplorerFile[]> {
  const files: ExplorerFile[] = [];
  try {
    const result = await Filesystem.readdir({
      path,
      directory
    });
    for (const f of result.files) {
      const itemPath = path ? `${path}/${f.name}` : f.name;
      if (f.type === 'directory') {
        // limit scan depth to avoid recursion bottleneck, subfiles read is deep capped
        const subFiles = await scanCapacitorDirectory(itemPath, directory);
        files.push(...subFiles);
      } else {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        let category: 'videos' | 'photos' | 'audios' | 'documents' | 'files' | 'apps' = 'files';
        
        if (['mp4', 'mkv', 'avi', 'mov', '3gp', 'webm'].includes(ext)) {
          category = 'videos';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
          category = 'photos';
        } else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
          category = 'audios';
        } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'].includes(ext)) {
          category = 'documents';
        } else if (['apk'].includes(ext)) {
          category = 'apps';
        }

        try {
          const uriResult = await Filesystem.getUri({
            path: itemPath,
            directory
          });
          
          let fileUrl = uriResult.uri;
          if (typeof window !== 'undefined' && (window as any).Capacitor) {
            fileUrl = (window as any).Capacitor.convertFileSrc(uriResult.uri);
          }

          files.push({
            id: `cap-${Math.random().toString(36).substring(4)}`,
            name: f.name,
            size: f.size || 0,
            category,
            detail: 'Native Native File',
            extension: ext,
            senderBlobUrl: fileUrl
          });
        } catch (e) {
          console.warn('Error reading URI for file:', f.name, e);
        }
      }
    }
  } catch (err) {
    console.warn(`Could not read native directory ${path}:`, err);
  }
  return files;
}

// Traverse directories recursively using Web File System Access API
export async function scanWebDirectory(dirHandle: any, path = ''): Promise<ExplorerFile[]> {
  const files: ExplorerFile[] = [];
  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        try {
          const file = await entry.getFile();
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          let category: 'videos' | 'photos' | 'audios' | 'documents' | 'files' | 'apps' = 'files';
          
          if (['mp4', 'mkv', 'avi', 'mov', '3gp', 'webm'].includes(ext)) {
            category = 'videos';
          } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
            category = 'photos';
          } else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
            category = 'audios';
          } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'ts', 'js', 'json'].includes(ext)) {
            category = 'documents';
          } else if (['apk'].includes(ext)) {
            category = 'apps';
          }

          const fileUrl = URL.createObjectURL(file);
          let rawText = '';
          if (['txt', 'md', 'ts', 'js', 'json', 'css', 'html'].includes(ext)) {
            try {
              rawText = await file.text();
            } catch (te) {
              console.warn('Could not read file text content', te);
            }
          }

          files.push({
            id: `web-${Math.random().toString(36).substring(4)}`,
            name: file.name,
            size: file.size,
            category,
            detail: file.type || 'Native Web File Stream',
            extension: ext,
            senderBlobUrl: fileUrl,
            rawText
          });
        } catch (fe) {
          console.warn('Error reading sub element file', fe);
        }
      } else if (entry.kind === 'directory') {
        const subFiles = await scanWebDirectory(entry, path ? `${path}/${entry.name}` : entry.name);
        files.push(...subFiles);
      }
    }
  } catch (err) {
    console.warn('Error parsing web directory handles:', err);
  }
  return files;
}
