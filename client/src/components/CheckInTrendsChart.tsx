import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface TrendData {
  day: string;
  weight: number;
  nutrition: number;
  performance: number;
  energy: number;
  stress: number;
  sleep: number;
  steps: number;
  water: number;
}

interface CheckInTrendsChartProps {
  data: TrendData[];
}

export function CheckInTrendsChart({ data }: CheckInTrendsChartProps) {
  const [timeRange, setTimeRange] = useState("all");

  const filteredData = (() => {
    if (timeRange === "all") return data;
    const days = parseInt(timeRange);
    if (!isNaN(days)) {
      // If we have fewer data points than requested, return all
      if (data.length < days) return data;
      return data.slice(-days);
    }
    return data;
  })();

  return (
    <Card className="p-6 rounded-2xl" data-testid="card-checkin-trends">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-2xl font-bold mb-1">Check-In Trends</h3>
          <p className="text-sm text-muted-foreground">Analyze your progress patterns over time</p>
        </div>
        <div className="w-full md:w-[180px]">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="14">Last 14 Days</SelectItem>
              <SelectItem value="5">Last 5 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="weight" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="weight" data-testid="tab-weight">Weight</TabsTrigger>
          <TabsTrigger value="scores" data-testid="tab-scores">Scores</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
          <TabsTrigger value="wellness" data-testid="tab-wellness">Wellness</TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} domain={[0, 10]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="nutrition" stroke="hsl(var(--chart-2))" strokeWidth={3} name="Nutrition" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="performance" stroke="hsl(var(--chart-1))" strokeWidth={3} name="Performance" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="energy" stroke="hsl(var(--chart-3))" strokeWidth={3} name="Energy" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="weight">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Line type="monotone" dataKey="weight" stroke="hsl(var(--chart-1))" strokeWidth={4} name="Weight (kg)" dot={{ fill: 'hsl(var(--chart-1))', r: 5 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="activity">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Bar dataKey="steps" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} name="Daily Steps" />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>

        <TabsContent value="wellness">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} domain={[0, 10]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="sleep" stroke="hsl(var(--chart-3))" strokeWidth={3} name="Sleep (hrs)" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="energy" stroke="hsl(var(--chart-2))" strokeWidth={3} name="Energy" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="stress" stroke="hsl(var(--chart-1))" strokeWidth={3} name="Stress" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="water" stroke="hsl(var(--chart-4))" strokeWidth={3} name="Water (L)" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
