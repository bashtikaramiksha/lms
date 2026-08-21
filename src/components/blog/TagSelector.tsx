"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tag as TagIcon, X, Plus, Check } from "lucide-react";

export interface TagOption {
  id: string;
  name: string;
  slug: string;
}

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  availableTags?: TagOption[];
  onTagCreated?: (tag: TagOption) => void;
}

export function TagSelector({
  selectedTagIds,
  onChange,
  availableTags = [],
  onTagCreated,
}: TagSelectorProps) {
  const [tags, setTags] = useState<TagOption[]>(availableTags);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (availableTags.length > 0) {
      setTags(availableTags);
    } else {
      // Fetch available tags
      fetch("/api/blog/tags")
        .then((res) => res.json())
        .then((res) => {
          if (res.success && res.data) {
            setTags(res.data);
          }
        })
        .catch(console.error);
    }
  }, [availableTags]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTags = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.slug.toLowerCase().includes(query.toLowerCase())
  );

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!query.trim() || isCreating) return;
    setIsCreating(true);

    const name = query.trim();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    try {
      const res = await fetch("/api/blog/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const newTag = data.data;
        if (!tags.some((t) => t.id === newTag.id)) {
          setTags((prev) => [...prev, newTag]);
        }
        if (!selectedTagIds.includes(newTag.id)) {
          onChange([...selectedTagIds, newTag.id]);
        }
        if (onTagCreated) {
          onTagCreated(newTag);
        }
        setQuery("");
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Failed to create tag:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
        Tags
      </label>

      {/* Selected tags badges */}
      <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20"
          >
            <TagIcon className="h-3 w-3 text-purple-400" />
            {tag.name}
            <button
              type="button"
              onClick={() => toggleTag(tag.id)}
              className="text-purple-400 hover:text-purple-200 transition-colors p-0.5 rounded-full hover:bg-purple-500/20"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (
                filteredTags.length > 0 &&
                filteredTags[0].name.toLowerCase() === query.trim().toLowerCase()
              ) {
                toggleTag(filteredTags[0].id);
                setQuery("");
              } else if (query.trim()) {
                handleCreateTag();
              }
            }
          }}
          placeholder={selectedTags.length === 0 ? "Search or create tags..." : "Add more tags..."}
          className="flex-1 min-w-[140px] bg-transparent text-xs text-slate-200 placeholder:text-slate-500 outline-none px-1 py-0.5"
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
          {filteredTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  toggleTag(tag.id);
                  setQuery("");
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TagIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium text-slate-200">{tag.name}</span>
                  <span className="text-slate-500 text-[10px]">#{tag.slug}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-purple-400" />}
              </button>
            );
          })}

          {query.trim() &&
            !filteredTags.some(
              (t) => t.name.toLowerCase() === query.trim().toLowerCase()
            ) && (
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={isCreating}
                className="w-full text-left px-3.5 py-2.5 text-xs text-purple-400 hover:bg-purple-500/10 flex items-center gap-2 border-t border-slate-800 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>
                  Create new tag: <strong className="text-purple-300">&ldquo;{query.trim()}&rdquo;</strong>
                </span>
              </button>
            )}

          {filteredTags.length === 0 && !query.trim() && (
            <div className="px-3.5 py-3 text-xs text-slate-500 text-center">
              No tags available. Type a name to create one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
