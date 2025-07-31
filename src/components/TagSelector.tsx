import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Hash, Plus, X, Search } from 'lucide-react';

interface TagSelectorProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  maxVisibleTags?: number;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ 
  allTags, 
  selectedTags, 
  onToggleTag,
  maxVisibleTags = 4
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get tag usage frequency (for now, just use alphabetical order as priority)
  const sortedTags = [...allTags].sort();
  
  // Show selected tags + popular unselected tags up to max limit
  const visibleTags = [
    ...selectedTags,
    ...sortedTags.filter(tag => !selectedTags.includes(tag)).slice(0, maxVisibleTags - selectedTags.length)
  ].slice(0, maxVisibleTags);

  const hiddenTagsCount = allTags.length - visibleTags.length;

  // Filter tags for modal search
  const filteredModalTags = sortedTags.filter(tag => 
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTagClick = (tag: string) => {
    onToggleTag(tag);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Selected tags (always visible with remove option) */}
      {selectedTags.map(tag => (
        <Badge 
          key={tag}
          variant="default"
          className="cursor-pointer bg-gradient-cyber text-primary-foreground border-primary hover:scale-105 transition-all group"
          onClick={() => handleTagClick(tag)}
        >
          <Hash className="w-3 h-3 mr-1" />
          {tag}
          <X className="w-3 h-3 ml-1 opacity-70 group-hover:opacity-100" />
        </Badge>
      ))}

      {/* Popular unselected tags */}
      {visibleTags.filter(tag => !selectedTags.includes(tag)).map(tag => (
        <Badge 
          key={tag}
          variant="outline"
          className="cursor-pointer transition-all hover:scale-105 hover:border-primary/50"
          onClick={() => handleTagClick(tag)}
        >
          <Hash className="w-3 h-3 mr-1" />
          {tag}
        </Badge>
      ))}

      {/* Show more button if there are hidden tags */}
      {hiddenTagsCount > 0 && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              <Plus className="w-3 h-3 mr-1" />
              {hiddenTagsCount} more
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select Tags</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Tag grid */}
              <div className="max-h-64 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {filteredModalTags.map(tag => (
                    <Badge 
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className={`cursor-pointer transition-all hover:scale-105 ${
                        selectedTags.includes(tag) 
                          ? "bg-gradient-cyber text-primary-foreground border-primary" 
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => handleTagClick(tag)}
                    >
                      <Hash className="w-3 h-3 mr-1" />
                      {tag}
                      {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Selected count */}
              {selectedTags.length > 0 && (
                <div className="text-sm text-muted-foreground text-center pt-2 border-t">
                  {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};