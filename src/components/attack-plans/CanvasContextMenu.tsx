import React from 'react';
import { Type, FileText, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextMenuProps {
  x: number;
  y: number;
  onAddTextBox: () => void;
  onClose: () => void;
  visible: boolean;
}

export const CanvasContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onAddTextBox,
  onClose,
  visible
}) => {
  if (!visible) return null;

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      {/* Backdrop to close menu */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Context Menu */}
      <div
        className="fixed z-50 bg-background border border-border rounded-lg shadow-lg py-2 min-w-[180px]"
        style={{
          left: x,
          top: y,
        }}
      >
        <div className="px-3 py-1 text-xs text-muted-foreground font-medium">
          Add to Canvas
        </div>
        
        <div className="border-t border-border my-1" />
        
        <button
          onClick={() => handleItemClick(onAddTextBox)}
          className={cn(
            "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
            "flex items-center gap-3 transition-colors"
          )}
        >
          <Type className="w-4 h-4" />
          <div>
            <div className="font-medium">Text Box</div>
            <div className="text-xs text-muted-foreground">Add formatted text with markdown support</div>
          </div>
        </button>
        
        {/* Future menu items can go here */}
        <button
          onClick={() => handleItemClick(() => {})}
          className={cn(
            "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
            "flex items-center gap-3 transition-colors opacity-50 cursor-not-allowed"
          )}
          disabled
        >
          <FileText className="w-4 h-4" />
          <div>
            <div className="font-medium">Sticky Note</div>
            <div className="text-xs text-muted-foreground">Coming soon...</div>
          </div>
        </button>
      </div>
    </>
  );
};

export default CanvasContextMenu;