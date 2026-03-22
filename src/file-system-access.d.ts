interface FileSystemHandle {
  queryPermission(descriptor?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(descriptor?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
}

interface FileSystemFileHandle extends FileSystemHandle {
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>
  close(): Promise<void>
}

interface Window {
  showDirectoryPicker(options?: {
    mode?: 'read' | 'readwrite'
    startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
  }): Promise<FileSystemDirectoryHandle>
}
