import { useQuery } from "@tanstack/react-query";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Newsletter, AnalyticsAggregate } from "@shared/schema";
import { AnalyticsFilters, type AnalyticsFilters as FilterType } from "@/components/analytics-filters";
import { useState } from "react";
import { isWithinInterval, parseISO } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"];

interface AnalyticsOverview {
  totalNewsletters: number;
  scheduledNewsletters: number;
  totalViews: number;
  avgEngagement: number;
}

interface ChartData {
  name: string;
  views: number;
  clicks: number;
}

interface TimeSeriesData {
  date: string;
  views: number;
  engagement: number;
}

export default function Analytics() {
  const [filters, setFilters] = useState<FilterType>({
    dateRange: {
      from: undefined,
      to: undefined,
    },
    category: "all",
    minViews: 0,
    minClicks: 0,
  });

  const { data: newsletters, isLoading: loadingNewsletters } = useQuery<Newsletter[]>({
    queryKey: ["/api/newsletters"],
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery<AnalyticsAggregate[]>({
    queryKey: ["/api/analytics/aggregates"],
  });

  const { data: overview, isLoading: loadingOverview } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview"],
  });

  if (loadingNewsletters || loadingAnalytics || loadingOverview) {
    return (
      <div className="flex min-h-screen">
        <SidebarNav />
        <main className="flex-1 p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
      </div>
    );
  }

  const filteredAnalytics = analytics?.filter((item) => {
    const newsletter = newsletters?.find((n) => n.id === item.newsletterId);
    if (!newsletter) return false;

    // Apply date range filter
    if (filters.dateRange.from && filters.dateRange.to) {
      const itemDate = parseISO(item.lastUpdated.toString());
      if (!isWithinInterval(itemDate, {
        start: filters.dateRange.from,
        end: filters.dateRange.to,
      })) {
        return false;
      }
    }

    // Apply category filter
    if (filters.category !== "all" && newsletter.templateId) {
      // You would need to fetch template category here or store it in newsletter
      // For now, we'll skip category filtering
    }

    // Apply metrics filters
    const views = item.totalViews ?? 0;
    const clicks = item.totalClicks ?? 0;
    return views >= filters.minViews && clicks >= filters.minClicks;
  });

  const chartData: ChartData[] = filteredAnalytics?.map((item) => ({
    name: `Newsletter #${item.newsletterId}`,
    views: item.totalViews ?? 0,
    clicks: item.totalClicks ?? 0,
  })) || [];

  // Generate time series data
  const timeSeriesData: TimeSeriesData[] = filteredAnalytics?.reduce((acc: TimeSeriesData[], item) => {
    const date = new Date(item.lastUpdated).toLocaleDateString();
    const existingEntry = acc.find((entry) => entry.date === date);

    if (existingEntry) {
      existingEntry.views += item.totalViews ?? 0;
      existingEntry.engagement = Math.round(
        ((item.totalClicks ?? 0) / (item.totalViews ?? 1)) * 100
      );
    } else {
      acc.push({
        date,
        views: item.totalViews ?? 0,
        engagement: Math.round(
          ((item.totalClicks ?? 0) / (item.totalViews ?? 1)) * 100
        ),
      });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

  const deliveryData = newsletters?.reduce((acc: any[], newsletter) => {
    const status = newsletter.deliveryStatus || 'pending';
    const existingStatus = acc.find(item => item.name === status);
    if (existingStatus) {
      existingStatus.value++;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, []) || [];

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

        <AnalyticsFilters onFiltersChange={setFilters} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Newsletters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totalNewsletters}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Scheduled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.scheduledNewsletters}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totalViews}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.avgEngagement}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="delivery">Delivery Status</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Newsletter Performance</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" />
                      <Bar dataKey="clicks" fill="hsl(var(--muted))" name="Clicks" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="views"
                        stroke="hsl(var(--primary))"
                        name="Views"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="engagement"
                        stroke="hsl(var(--muted))"
                        name="Engagement %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deliveryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {deliveryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}