import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Star, Terminal, MessageSquare, ExternalLink, TrendingUp, BarChart3, Users, Clock } from 'lucide-react';

interface TechniqueActivity {
  technique_id?: string;
  technique_title: string;
  mitre_id: string;
  phase: string;
  category: string;
  activity_type: string;
  activity_count: number;
  unique_users: number;
  last_accessed: string;
  activities?: { [key: string]: number };
  id?: string;
  created_at?: string;
}

interface GroupedTechniqueActivity {
  technique_title: string;
  mitre_id: string;
  phase: string;
  category: string;
  total_activities: number;
  unique_users: number;
  last_accessed: string;
  individual_activities: TechniqueActivity[];
}

interface TechniqueStats {
  totalViews: number;
  totalFavorites: number;
  totalCommands: number;
  totalAIQueries: number;
  totalMitreAccess: number;
  topTechniques: TechniqueActivity[];
  recentActivities: TechniqueActivity[];
  groupedRecentActivities: GroupedTechniqueActivity[];
}

export const TechniqueAnalytics = () => {
  const [stats, setStats] = useState<TechniqueStats>({
    totalViews: 0,
    totalFavorites: 0,
    totalCommands: 0,
    totalAIQueries: 0,
    totalMitreAccess: 0,
    topTechniques: [],
    recentActivities: [],
    groupedRecentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7'); // days

  useEffect(() => {
    loadTechniqueAnalytics();
  }, [dateRange]);

  const loadTechniqueAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      
      // Get technique activity counts
      const { data: activityData, error: activityError } = await supabase
        .from('user_activity_log')
        .select('*')
        .in('activity_type', [
          'technique_viewed',
          'technique_modal_opened',
          'technique_favorited',
          'technique_unfavorited',
          'technique_command_generated',
          'technique_ai_query',
          'technique_mitre_link_accessed'
        ])
        .gte('created_at', startDate.toISOString());

      if (activityError) throw activityError;

      // Process the data
      const activities = activityData || [];
      
      // Parse technique data from descriptions
      const processedActivities = activities.map(activity => {
        const description = activity.description || '';
        const titleMatch = description.match(/: (.+?)(?:\s\(|$)/);
        const mitreMatch = description.match(/\(([T]\d{4}(?:\.\d{3})?)\)/);
        const phaseMatch = description.match(/Phase: (.+?)(?:\s|$)/);
        
        return {
          ...activity,
          technique_title: titleMatch?.[1] || 'Unknown',
          mitre_id: mitreMatch?.[1] || '',
          phase: phaseMatch?.[1] || 'Unknown'
        };
      });

      // Calculate statistics
      const totalViews = processedActivities.filter(a => 
        a.activity_type === 'technique_viewed' || a.activity_type === 'technique_modal_opened'
      ).length;
      
      const totalFavorites = processedActivities.filter(a => 
        a.activity_type === 'technique_favorited'
      ).length;
      
      const totalCommands = processedActivities.filter(a => 
        a.activity_type === 'technique_command_generated'
      ).length;
      
      const totalAIQueries = processedActivities.filter(a => 
        a.activity_type === 'technique_ai_query'
      ).length;
      
      const totalMitreAccess = processedActivities.filter(a => 
        a.activity_type === 'technique_mitre_link_accessed'
      ).length;

      // Group by technique for top techniques
      const techniqueGroups: { [key: string]: any } = {};
      
      processedActivities.forEach(activity => {
        const key = activity.technique_title;
        if (!techniqueGroups[key]) {
          techniqueGroups[key] = {
            technique_title: activity.technique_title,
            mitre_id: activity.mitre_id,
            phase: activity.phase,
            category: 'General',
            activities: {},
            unique_users: new Set(),
            last_accessed: activity.created_at
          };
        }
        
        if (!techniqueGroups[key].activities[activity.activity_type]) {
          techniqueGroups[key].activities[activity.activity_type] = 0;
        }
        
        techniqueGroups[key].activities[activity.activity_type]++;
        techniqueGroups[key].unique_users.add(activity.user_id);
        
        if (new Date(activity.created_at) > new Date(techniqueGroups[key].last_accessed)) {
          techniqueGroups[key].last_accessed = activity.created_at;
        }
      });

      // Convert to top techniques array
      const topTechniques: TechniqueActivity[] = Object.values(techniqueGroups)
        .map((group: any) => ({
          technique_title: group.technique_title,
          mitre_id: group.mitre_id,
          phase: group.phase,
          category: group.category,
          activity_type: 'combined',
          activity_count: Object.values(group.activities).reduce((sum: number, count: any) => sum + count, 0) as number,
          unique_users: group.unique_users.size,
          last_accessed: group.last_accessed,
          activities: group.activities
        }))
        .sort((a, b) => b.activity_count - a.activity_count)
        .slice(0, 10);

      const recentActivities: TechniqueActivity[] = processedActivities
        .map(activity => ({
          id: activity.id,
          technique_title: activity.technique_title,
          mitre_id: activity.mitre_id,
          phase: activity.phase,
          category: 'General',
          activity_type: activity.activity_type,
          activity_count: 1,
          unique_users: 1,
          last_accessed: activity.created_at,
          created_at: activity.created_at
        }))
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
        .slice(0, 20);

      // Group recent activities by technique for accordion view
      const recentGroups: { [key: string]: any } = {};
      
      processedActivities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 100) // Get more activities for grouping
        .forEach(activity => {
          const key = activity.technique_title;
          if (!recentGroups[key]) {
            recentGroups[key] = {
              technique_title: activity.technique_title,
              mitre_id: activity.mitre_id,
              phase: activity.phase,
              category: 'General',
              activities: [],
              unique_users: new Set(),
              last_accessed: activity.created_at
            };
          }
          
          recentGroups[key].activities.push({
            id: activity.id,
            technique_title: activity.technique_title,
            mitre_id: activity.mitre_id,
            phase: activity.phase,
            category: 'General',
            activity_type: activity.activity_type,
            activity_count: 1,
            unique_users: 1,
            last_accessed: activity.created_at,
            created_at: activity.created_at
          });
          
          recentGroups[key].unique_users.add(activity.user_id);
          
          if (new Date(activity.created_at) > new Date(recentGroups[key].last_accessed)) {
            recentGroups[key].last_accessed = activity.created_at;
          }
        });

      const groupedRecentActivities: GroupedTechniqueActivity[] = Object.values(recentGroups)
        .map((group: any) => ({
          technique_title: group.technique_title,
          mitre_id: group.mitre_id,
          phase: group.phase,
          category: group.category,
          total_activities: group.activities.length,
          unique_users: group.unique_users.size,
          last_accessed: group.last_accessed,
          individual_activities: group.activities
        }))
        .sort((a, b) => new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime())
        .slice(0, 20);

      setStats({
        totalViews,
        totalFavorites,
        totalCommands,
        totalAIQueries,
        totalMitreAccess,
        topTechniques,
        recentActivities,
        groupedRecentActivities
      });

    } catch (error) {
      console.error('Error loading technique analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'technique_viewed':
      case 'technique_modal_opened':
        return <Eye className="w-4 h-4" />;
      case 'technique_favorited':
        return <Star className="w-4 h-4" />;
      case 'technique_command_generated':
        return <Terminal className="w-4 h-4" />;
      case 'technique_ai_query':
        return <MessageSquare className="w-4 h-4" />;
      case 'technique_mitre_link_accessed':
        return <ExternalLink className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  const formatActivityType = (activityType: string) => {
    return activityType
      .replace('technique_', '')
      .replace('_', ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Technique Analytics</h2>
          <p className="text-muted-foreground">Track how users interact with cybersecurity techniques</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={dateRange === '7' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('7')}
          >
            7 Days
          </Button>
          <Button
            variant={dateRange === '30' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('30')}
          >
            30 Days
          </Button>
          <Button
            variant={dateRange === '90' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange('90')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFavorites}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-500" />
              Commands Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCommands}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              AI Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAIQueries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-500" />
              MITRE Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMitreAccess}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="top-techniques" className="space-y-4">
        <TabsList>
          <TabsTrigger value="top-techniques">Top Techniques</TabsTrigger>
          <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="top-techniques">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Most Popular Techniques
              </CardTitle>
              <CardDescription>
                Techniques ranked by total user interactions. Click to expand activity breakdown.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Technique Name</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead className="text-center">Total Activities</TableHead>
                      <TableHead className="text-center">Users</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                
                <Accordion type="multiple" className="w-full">
                  {stats.topTechniques.map((technique, index) => (
                    <AccordionItem key={`${technique.technique_title}-${index}`} value={`technique-${index}`} className="border-0">
                      <AccordionTrigger className="hover:no-underline p-0">
                        <div className="flex w-full items-center">
                          <div className="w-16 flex justify-center">
                            <Badge variant="secondary" className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">
                              #{index + 1}
                            </Badge>
                          </div>
                          <div className="flex-1 text-left px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{technique.technique_title}</span>
                              {technique.mitre_id && (
                                <Badge variant="outline" className="text-xs">{technique.mitre_id}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="w-32 text-center">
                            {technique.phase && (
                              <Badge variant="secondary" className="text-xs">{technique.phase}</Badge>
                            )}
                          </div>
                          <div className="w-32 text-center font-medium">
                            {technique.activity_count}
                          </div>
                          <div className="w-32 text-center">
                            {technique.unique_users}
                          </div>
                          <div className="w-16"></div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="px-4 py-3 bg-muted/30 rounded-lg ml-16 mr-16">
                          <h4 className="font-medium mb-3">Activity Breakdown</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="font-medium">{(technique.activities?.technique_viewed || 0) + (technique.activities?.technique_modal_opened || 0)}</p>
                                <p className="text-xs text-muted-foreground">Views</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <div>
                                <p className="font-medium">{technique.activities?.technique_favorited || 0}</p>
                                <p className="text-xs text-muted-foreground">Favorites</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Terminal className="h-4 w-4 text-green-500" />
                              <div>
                                <p className="font-medium">{technique.activities?.technique_command_generated || 0}</p>
                                <p className="text-xs text-muted-foreground">Commands</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-purple-500" />
                              <div>
                                <p className="font-medium">{technique.activities?.technique_ai_query || 0}</p>
                                <p className="text-xs text-muted-foreground">AI Queries</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4 text-orange-500" />
                              <div>
                                <p className="font-medium">{technique.activities?.technique_mitre_link_accessed || 0}</p>
                                <p className="text-xs text-muted-foreground">MITRE Links</p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-muted-foreground">
                            Last activity: {new Date(technique.last_accessed).toLocaleString()}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent-activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Activity by Technique
              </CardTitle>
              <CardDescription>
                Latest technique interactions grouped by technique. Click to expand details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Technique</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead className="text-center">Activities</TableHead>
                      <TableHead className="text-center">Users</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                
                <Accordion type="multiple" className="w-full">
                  {stats.groupedRecentActivities.map((group, index) => (
                    <AccordionItem 
                      key={`${group.technique_title}-${index}`} 
                      value={`technique-${index}`}
                      className="border-x-0 border-t-0 last:border-b-0"
                    >
                      <AccordionTrigger className="hover:no-underline px-4 py-3">
                        <div className="grid grid-cols-5 gap-4 w-full text-left">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{group.technique_title}</span>
                            {group.mitre_id && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {group.mitre_id}
                              </Badge>
                            )}
                          </div>
                          <div>
                            <Badge variant="secondary" className="text-xs">
                              {group.phase}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <Badge variant="default" className="text-xs">
                              {group.total_activities}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <span className="flex items-center justify-center gap-1 text-sm">
                              <Users className="w-3 h-3" />
                              {group.unique_users}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(group.last_accessed).toLocaleDateString()}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          <h4 className="text-sm font-medium text-muted-foreground mb-3">
                            Individual Activities ({group.individual_activities.length})
                          </h4>
                          {group.individual_activities.slice(0, 10).map((activity, actIndex) => (
                            <div
                              key={`${activity.id}-${actIndex}`}
                              className="flex items-center gap-3 p-2 bg-muted/30 rounded-md"
                            >
                              <div className="flex-shrink-0">
                                {getActivityIcon(activity.activity_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">
                                  {formatActivityType(activity.activity_type)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {activity.created_at ? new Date(activity.created_at).toLocaleString() : 'Unknown'}
                                </div>
                              </div>
                            </div>
                          ))}
                          {group.individual_activities.length > 10 && (
                            <div className="text-xs text-muted-foreground text-center py-2">
                              ... and {group.individual_activities.length - 10} more activities
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};