'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  compact?: boolean
  onAnalyze: (file?: File) => void
}

export function UploadZone({ compact, onAnalyze }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) onAnalyze(files[0])
  }, [onAnalyze])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'application/zip': ['.zip'], 'application/x-zip-compressed': ['.zip'] },
    maxSize: 100 * 1024 * 1024,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-xl text-center cursor-pointer transition-all',
        compact ? 'p-5' : 'p-10',
        isDragActive
          ? 'border-indigo-500 bg-indigo-500/8'
          : 'border-white/14 bg-gradient-to-br from-indigo-500/3 to-transparent hover:border-indigo-500/50 hover:bg-indigo-500/5'
      )}
    >
      <input {...getInputProps()} />
      <div className={cn('mb-2', compact ? 'text-2xl' : 'text-4xl')}>📦</div>
      <div className={cn('font-display font-semibold text-[var(--text)] mb-1', compact ? 'text-xs' : 'text-base')}>
        {isDragActive ? 'Drop it!' : 'Drag & drop repository'}
      </div>
      <div className={cn('text-[var(--text2)]', compact ? 'text-[10px]' : 'text-xs')}>
        ZIP format · Max 100MB
      </div>
    </div>
  )
}
