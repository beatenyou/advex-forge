import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';
import { Edit3, Trash2, Bold, Italic, List, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TextareaAutosize from 'react-textarea-autosize';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { cn } from '@/lib/utils';

export interface TextNodeData {
  content: string;
  isEditing?: boolean;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

interface TextNodeProps {
  id: string;
  data: TextNodeData;
  selected: boolean;
}

export const TextNode: React.FC<TextNodeProps> = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(data.isEditing || false);
  const [content, setContent] = useState(data.content || 'Enter your text here...');
  const [fontSize, setFontSize] = useState(data.fontSize || 'base');
  const [fontWeight, setFontWeight] = useState(data.fontWeight || 'normal');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  

  // Sync local state with node data changes (for loading saved plans)
  useEffect(() => {
    setContent(data.content || 'Enter your text here...');
    setFontSize(data.fontSize || 'base');
    setFontWeight(data.fontWeight || 'normal');
    setIsEditing(data.isEditing || false);
  }, [data.content, data.fontSize, data.fontWeight, data.isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);


  const handleSave = () => {
    setIsEditing(false);
    // Update the node data
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { 
              ...node, 
              data: { 
                ...node.data, 
                content, 
                isEditing: false,
                fontSize,
                fontWeight
              } 
            }
          : node
      )
    );
  };

  const handleCancel = () => {
    setContent(data.content || 'Enter your text here...');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent global keydown handlers from interfering
    e.stopPropagation();
    
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
    // Allow backspace and delete to work normally in text input
  };

  const insertMarkdown = (syntax: string, wrap: boolean = false) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let newText;
    if (wrap && selectedText) {
      newText = content.substring(0, start) + syntax + selectedText + syntax + content.substring(end);
    } else {
      newText = content.substring(0, start) + syntax + content.substring(end);
    }
    
    setContent(newText);
    
    // Set cursor position after insertion
    setTimeout(() => {
      if (wrap && selectedText) {
        textarea.setSelectionRange(start + syntax.length, end + syntax.length);
      } else {
        textarea.setSelectionRange(start + syntax.length, start + syntax.length);
      }
    }, 0);
  };

  const handleDelete = () => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  const fontSizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const fontWeightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };

  return (
    <div 
      className="bg-background border border-border rounded-lg shadow-lg relative group"
      style={{ 
        width: 300,
        height: 200,
        minWidth: 150,
        minHeight: 80
      }}
    >
      <NodeResizer minWidth={150} minHeight={80} isVisible={selected} />
      
      {/* Toolbar - visible when selected or editing */}
      {(selected || isEditing) && (
        <div className="absolute -top-10 left-0 flex items-center gap-1 bg-background border border-border rounded-md shadow-md p-1 z-10">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => insertMarkdown('**', true)}
                className="h-6 w-6 p-0"
              >
                <Bold className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => insertMarkdown('*', true)}
                className="h-6 w-6 p-0"
              >
                <Italic className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => insertMarkdown('- ')}
                className="h-6 w-6 p-0"
              >
                <List className="w-3 h-3" />
              </Button>
              <div className="h-4 w-px bg-border mx-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                className="h-6 px-2 text-xs"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="h-6 px-2 text-xs"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as any)}
                className="h-6 text-xs border border-border rounded px-1 bg-background"
              >
                <option value="sm">Small</option>
                <option value="base">Normal</option>
                <option value="lg">Large</option>
                <option value="xl">X-Large</option>
              </select>
              <select
                value={fontWeight}
                onChange={(e) => setFontWeight(e.target.value as any)}
                className="h-6 text-xs border border-border rounded px-1 bg-background"
              >
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="semibold">Semi-bold</option>
                <option value="bold">Bold</option>
              </select>
              <div className="h-4 w-px bg-border mx-1" />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3 h-full flex-1">
        {isEditing ? (
          <TextareaAutosize
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full resize-none border-none bg-transparent p-0 focus:ring-0 focus:outline-none",
              "whitespace-pre-wrap overflow-hidden",
              fontSizeClasses[fontSize],
              fontWeightClasses[fontWeight]
            )}
            placeholder="Enter your text here... (Supports Markdown)"
            minRows={2}
            style={{ 
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
          />
        ) : (
          <div 
            className={cn(
              "w-full h-full overflow-auto cursor-pointer whitespace-pre-wrap",
              fontSizeClasses[fontSize],
              fontWeightClasses[fontWeight]
            )}
            onClick={() => setIsEditing(true)}
            style={{ 
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              lineHeight: '1.5'
            }}
          >
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>

      {/* Handles for connections */}
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100" />
      <Handle type="target" position={Position.Left} className="opacity-0 group-hover:opacity-100" />
      <Handle type="source" position={Position.Right} className="opacity-0 group-hover:opacity-100" />
    </div>
  );
};

export default TextNode;