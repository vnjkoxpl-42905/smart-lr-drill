import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, X, Search, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TypeDrillConfig } from '@/types/drill';
import type { QuestionManifest, LRQuestion } from '@/lib/questionLoader';
import { questionBank } from '@/lib/questionLoader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuestionPickerProps {
  manifest: QuestionManifest;
  onStartDrill: (config: TypeDrillConfig) => void;
  onCancel: () => void;
}

interface FilterState {
  prepTests: number[];
  questionTypes: string[];
  difficulties: number[];
  searchQuery: string;
}

interface QuestionRow extends LRQuestion {
  attemptCount: number;
}

export function QuestionPicker({ manifest, onStartDrill, onCancel }: QuestionPickerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    prepTests: [],
    questionTypes: [],
    difficulties: [],
    searchQuery: '',
  });
  
  // Selection state
  const [selectedQids, setSelectedQids] = useState<Set<string>>(new Set());
  
  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [attemptCounts, setAttemptCounts] = useState<Map<string, number>>(new Map());
  
  // Available options
  const allPTs = useMemo(() => 
    Array.from(new Set(manifest.sections.map(s => s.pt))).sort((a, b) => a - b),
    [manifest]
  );
  
  const allQTypes = useMemo(() => 
    Object.keys(manifest.byQType).sort((a, b) => a.localeCompare(b)),
    [manifest]
  );
  
  const allDifficulties = [1, 2, 3, 4, 5];
  
  // Load attempt counts
  useEffect(() => {
    async function loadAttempts() {
      if (!user) return;
      
      try {
        const { data: student } = await supabase
          .from('students')
          .select('class_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!student?.class_id) return;
        
        const { data: attempts } = await supabase
          .from('attempts')
          .select('qid')
          .eq('class_id', student.class_id);
        
        if (attempts) {
          const counts = new Map<string, number>();
          attempts.forEach(a => {
            counts.set(a.qid, (counts.get(a.qid) || 0) + 1);
          });
          setAttemptCounts(counts);
        }
      } catch (err) {
        console.error('Failed to load attempt counts:', err);
      }
    }
    
    loadAttempts();
  }, [user]);
  
  // Filter and paginate questions
  const { filteredQuestions, totalCount } = useMemo(() => {
    let questions = questionBank.getAllQuestions();
    
    // Apply filters
    if (filters.prepTests.length > 0) {
      questions = questions.filter(q => filters.prepTests.includes(q.pt));
    }
    
    if (filters.questionTypes.length > 0) {
      questions = questions.filter(q => filters.questionTypes.includes(q.qtype));
    }
    
    if (filters.difficulties.length > 0) {
      questions = questions.filter(q => filters.difficulties.includes(q.difficulty));
    }
    
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      questions = questions.filter(q => 
        q.questionStem.toLowerCase().includes(query) ||
        q.qid.toLowerCase().includes(query)
      );
    }
    
    return {
      filteredQuestions: questions,
      totalCount: questions.length
    };
  }, [filters]);
  
  // Paginated questions
  const paginatedQuestions: QuestionRow[] = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return filteredQuestions
      .slice(startIndex, endIndex)
      .map(q => ({
        ...q,
        attemptCount: attemptCounts.get(q.qid) || 0
      }));
  }, [filteredQuestions, currentPage, pageSize, attemptCounts]);
  
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Toggle filter chip
  const toggleFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K] extends (infer U)[] ? U : never
  ) => {
    setFilters(prev => {
      const current = prev[key] as any[];
      const newValue = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: newValue };
    });
    setCurrentPage(1); // Reset to first page
  };
  
  // Remove filter chip
  const removeFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K] extends (infer U)[] ? U : never
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: (prev[key] as any[]).filter(v => v !== value)
    }));
    setCurrentPage(1);
  };
  
  // Toggle question selection
  const toggleQuestion = (qid: string) => {
    setSelectedQids(prev => {
      const next = new Set(prev);
      if (next.has(qid)) {
        next.delete(qid);
      } else {
        next.add(qid);
      }
      return next;
    });
  };
  
  // Add random questions
  const addRandomQuestions = (count: number) => {
    const available = filteredQuestions
      .filter(q => !selectedQids.has(q.qid))
      .map(q => q.qid);
    
    if (available.length === 0) {
      if (filteredQuestions.length === 0) {
        toast({
          title: "No questions available",
          description: "Try adjusting your filters to see more questions.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "All questions selected",
          description: "All questions matching your filters are already selected.",
          variant: "destructive",
        });
      }
      return;
    }
    
    const toAdd = Math.min(count, available.length);
    const shuffled = available.sort(() => Math.random() - 0.5);
    const randomQids = shuffled.slice(0, toAdd);
    
    setSelectedQids(prev => {
      const next = new Set(prev);
      randomQids.forEach(qid => next.add(qid));
      return next;
    });
    
    toast({
      title: `Added ${randomQids.length} questions`,
      description: `${randomQids.length} random questions added to your selection.`,
    });
  };
  
  // Create drill
  const handleCreateSet = () => {
    if (selectedQids.size === 0) {
      toast({
        title: "No questions selected",
        description: "Please select at least one question to create a drill.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate that all selected questions still exist
    const selectedQuestions = Array.from(selectedQids)
      .map(qid => questionBank.getQuestion(qid))
      .filter(Boolean) as LRQuestion[];
    
    if (selectedQuestions.length === 0) {
      toast({
        title: "Invalid selection",
        description: "None of the selected questions could be found. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedQuestions.length !== selectedQids.size) {
      toast({
        title: "Some questions unavailable",
        description: `${selectedQids.size - selectedQuestions.length} selected questions could not be found and were skipped.`,
      });
    }
    
    const qtypes = Array.from(new Set(selectedQuestions.map(q => q.qtype)));
    const difficulties = Array.from(new Set(selectedQuestions.map(q => q.difficulty)));
    const pts = Array.from(new Set(selectedQuestions.map(q => q.pt)));
    
    const config: TypeDrillConfig = {
      qtypes,
      difficulties,
      pts,
      count: selectedQuestions.length,
      selectedQids: selectedQuestions.map(q => q.qid), // Use validated qids
    };
    
    onStartDrill(config);
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedQids(new Set());
    toast({
      title: "Selection cleared",
      description: "All selected questions have been removed.",
    });
  };
  
  // Get first 6-7 words of stem
  const getStemPreview = (stem: string): string => {
    const words = stem.split(' ').slice(0, 7);
    return words.join(' ') + (stem.split(' ').length > 7 ? '...' : '');
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Build a Set</h1>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
      
      {/* Filter Bar */}
      <Card className="p-4 mb-4">
        <div className="space-y-4">
          {/* Filter Controls */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* PrepTest Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  PrepTests {filters.prepTests.length > 0 && `(${filters.prepTests.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-h-[400px] overflow-y-auto" align="start">
                <div className="space-y-2">
                  <div className="font-medium text-sm mb-2">Select PrepTests</div>
                  {allPTs.map(pt => (
                    <div key={pt} className="flex items-center space-x-2">
                      <Checkbox
                        id={`pt-${pt}`}
                        checked={filters.prepTests.includes(pt)}
                        onCheckedChange={() => toggleFilter('prepTests', pt)}
                      />
                      <label htmlFor={`pt-${pt}`} className="text-sm cursor-pointer flex-1">
                        PT{pt} ({manifest.byPT[`PT${pt}`] || 0} questions)
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Question Type Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Question Type {filters.questionTypes.length > 0 && `(${filters.questionTypes.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 max-h-[400px] overflow-y-auto" align="start">
                <div className="space-y-2">
                  <div className="font-medium text-sm mb-2">Select Question Types</div>
                  {allQTypes.map(qtype => (
                    <div key={qtype} className="flex items-center space-x-2">
                      <Checkbox
                        id={`qtype-${qtype}`}
                        checked={filters.questionTypes.includes(qtype)}
                        onCheckedChange={() => toggleFilter('questionTypes', qtype)}
                      />
                      <label htmlFor={`qtype-${qtype}`} className="text-sm cursor-pointer flex-1">
                        {qtype} ({manifest.byQType[qtype] || 0})
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Difficulty Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  Difficulty {filters.difficulties.length > 0 && `(${filters.difficulties.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="start">
                <div className="space-y-2">
                  <div className="font-medium text-sm mb-2">Select Difficulties</div>
                  {allDifficulties.map(diff => (
                    <div key={diff} className="flex items-center space-x-2">
                      <Checkbox
                        id={`diff-${diff}`}
                        checked={filters.difficulties.includes(diff)}
                        onCheckedChange={() => toggleFilter('difficulties', diff)}
                      />
                      <label htmlFor={`diff-${diff}`} className="text-sm cursor-pointer flex-1">
                        Level {diff} ({manifest.byDifficulty[diff] || 0})
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={filters.searchQuery}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
                  setCurrentPage(1);
                }}
                className="pl-8"
              />
            </div>
            
            {/* Page Size */}
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Show 10</SelectItem>
                <SelectItem value="25">Show 25</SelectItem>
                <SelectItem value="50">Show 50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Active Filters */}
          {(filters.prepTests.length > 0 || filters.questionTypes.length > 0 || filters.difficulties.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {filters.prepTests.map(pt => (
                <Badge key={`pt-${pt}`} variant="secondary" className="gap-1">
                  PT{pt}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('prepTests', pt)} />
                </Badge>
              ))}
              {filters.questionTypes.map(qtype => (
                <Badge key={`qtype-${qtype}`} variant="secondary" className="gap-1">
                  {qtype}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('questionTypes', qtype)} />
                </Badge>
              ))}
              {filters.difficulties.map(diff => (
                <Badge key={`diff-${diff}`} variant="secondary" className="gap-1">
                  Level {diff}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFilter('difficulties', diff)} />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
      
      {/* Results Info */}
      <div className="mb-4 text-sm text-muted-foreground">
        Showing {paginatedQuestions.length} of {totalCount} questions
        {selectedQids.size > 0 && ` • ${selectedQids.size} selected`}
      </div>
      
      {/* Results Table */}
      <Card className="flex-1 overflow-hidden flex flex-col mb-20">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={paginatedQuestions.length > 0 && paginatedQuestions.every(q => selectedQids.has(q.qid))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedQids(prev => {
                          const next = new Set(prev);
                          paginatedQuestions.forEach(q => next.add(q.qid));
                          return next;
                        });
                      } else {
                        setSelectedQids(prev => {
                          const next = new Set(prev);
                          paginatedQuestions.forEach(q => next.delete(q.qid));
                          return next;
                        });
                      }
                    }}
                  />
                </TableHead>
                <TableHead>PT</TableHead>
                <TableHead>Sec</TableHead>
                <TableHead>Q#</TableHead>
                <TableHead className="w-[300px]">Stem</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Attempts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No questions match your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedQuestions.map((q) => (
                  <TableRow
                    key={q.qid}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedQids.has(q.qid) && "bg-primary/5"
                    )}
                    onClick={() => toggleQuestion(q.qid)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedQids.has(q.qid)}
                        onCheckedChange={() => toggleQuestion(q.qid)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{q.pt}</TableCell>
                    <TableCell>{q.section}</TableCell>
                    <TableCell>{q.qnum}</TableCell>
                    <TableCell className="text-sm">{getStemPreview(q.questionStem)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {q.qtype}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          q.difficulty === 5 && "bg-red-500/10 text-red-400",
                          q.difficulty === 4 && "bg-orange-500/10 text-orange-400",
                          q.difficulty === 3 && "bg-yellow-500/10 text-yellow-400",
                          q.difficulty === 2 && "bg-green-500/10 text-green-400",
                          q.difficulty === 1 && "bg-blue-500/10 text-blue-400"
                        )}
                      >
                        {q.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{q.attemptCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Sticky Selection Tray */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="font-medium">
                Selected: <span className="text-primary">{selectedQids.size}</span>
              </div>
              {selectedQids.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {filteredQuestions.length > selectedQids.size && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const count = Math.min(10, filteredQuestions.length - selectedQids.size);
                    addRandomQuestions(count);
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Add {Math.min(10, filteredQuestions.length - selectedQids.size)} Random
                </Button>
              )}
              
              <Button
                onClick={handleCreateSet}
                disabled={selectedQids.size === 0}
                className="min-w-[140px]"
              >
                Create Set {selectedQids.size > 0 && `(${selectedQids.size})`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
