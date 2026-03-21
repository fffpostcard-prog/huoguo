import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { queryUsers } from '@/api/system/AdminSysUser';
import type { SysUser, SalesPerformance, EditorWorkRecord, UserPosition } from '@/types';

const salesSchema = z.object({
  performance: z
    .string()
    .min(1, '请输入销售业绩')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, '销售业绩必须为非负数'),
});

const editorSchema = z.object({
  videoCount: z
    .string()
    .min(1, '请输入视频数量')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, '视频数量必须为非负整数'),
  copyCount: z
    .string()
    .min(1, '请输入文案数量')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, '文案数量必须为非负整数'),
});

const performanceSchema = z.object({
  date: z.string().min(1, '请选择日期'),
  merchant: z.string().min(1, '请输入商家名称'),
  amount: z
    .string()
    .min(1, '请输入金额')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, '金额必须为非负数'),
  months: z
    .string()
    .min(1, '请输入月数')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, '月数必须为正整数'),
});

const editorWorkSchema = z.object({
  date: z.string().min(1, '请选择日期'),
  videoCount: z
    .string()
    .min(1, '请输入视频数量')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, '视频数量必须为非负整数'),
  copyCount: z
    .string()
    .min(1, '请输入文案数量')
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0, '文案数量必须为非负整数'),
  remark: z.string(),
});

type SalesFormData = z.infer<typeof salesSchema>;
type EditorFormData = z.infer<typeof editorSchema>;
type PerformanceFormData = z.infer<typeof performanceSchema>;
type EditorWorkFormData = z.infer<typeof editorWorkSchema>;

function formatCurrency(value: number): string {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  return '¥ ' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function CommissionCalcPage() {
  const [users, setUsers] = useState<SysUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [performances, setPerformances] = useState<SalesPerformance[]>([]);
  const [editorWorks, setEditorWorks] = useState<EditorWorkRecord[]>([]);
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [editorDialogOpen, setEditorDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const salesForm = useForm<SalesFormData>({
    resolver: zodResolver(salesSchema),
    defaultValues: { performance: '' },
  });

  const editorForm = useForm<EditorFormData>({
    resolver: zodResolver(editorSchema),
    defaultValues: { videoCount: '0', copyCount: '0' },
  });

  const performanceForm = useForm<PerformanceFormData>({
    resolver: zodResolver(performanceSchema),
    defaultValues: { date: '', merchant: '', amount: '', months: '1' },
  });

  const editorWorkForm = useForm<EditorWorkFormData>({
    resolver: zodResolver(editorWorkSchema),
    defaultValues: { date: '', videoCount: '0', copyCount: '0', remark: '' },
  });

  // 加载用户列表
  useEffect(() => {
    setLoading(true);
    queryUsers()
      .then((data) => {
        setUsers(data);
        if (data.length > 0) {
          setSelectedUserId(data[0].id || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const userPosition = (selectedUser?.roleCode as UserPosition) || 'SALES';

  const handleAddPerformance = (data: PerformanceFormData) => {
    const newPerformance: SalesPerformance = {
      id: generateId(),
      date: data.date,
      merchant: data.merchant,
      amount: Number(data.amount),
      months: Number(data.months),
    };
    setPerformances((prev) => [...prev, newPerformance]);
    performanceForm.reset({ date: '', merchant: '', amount: '', months: '1' });
    setSalesDialogOpen(false);
  };

  const handleDeletePerformance = (id: string) => {
    setPerformances((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddEditorWork = (data: EditorWorkFormData) => {
    const newWork: EditorWorkRecord = {
      id: generateId(),
      date: data.date,
      videoCount: Number(data.videoCount),
      copyCount: Number(data.copyCount),
      remark: data.remark,
    };
    setEditorWorks((prev) => [...prev, newWork]);
    editorWorkForm.reset({ date: '', videoCount: '0', copyCount: '0', remark: '' });
    setEditorDialogOpen(false);
  };

  const handleDeleteEditorWork = (id: string) => {
    setEditorWorks((prev) => prev.filter((w) => w.id !== id));
  };

  const salesResult = useMemo(() => {
    const p = Number(salesForm.watch('performance') || 0);
    const base = Math.min(20000, p);
    const extra = Math.max(0, p - 20000);
    const baseCommission = base * 0.08;
    const extraCommission = extra * 0.1;
    const total = baseCommission + extraCommission;
    return { p, base, extra, baseCommission, extraCommission, total };
  }, [salesForm]);

  const performanceResult = useMemo(() => {
    const totalAmount = performances.reduce((sum, p) => sum + p.amount, 0);
    const base = Math.min(20000, totalAmount);
    const extra = Math.max(0, totalAmount - 20000);
    const baseCommission = base * 0.08;
    const extraCommission = extra * 0.1;
    const total = baseCommission + extraCommission;
    return { totalAmount, base, extra, baseCommission, extraCommission, total };
  }, [performances]);

  const editorResult = useMemo(() => {
    const videoCount = Number(editorForm.watch('videoCount') || 0);
    const copyCount = Number(editorForm.watch('copyCount') || 0);
    const videoFee = videoCount * 20;
    const copyFee = copyCount * 5;
    const total = videoFee + copyFee;
    return { videoCount, copyCount, videoFee, copyFee, total };
  }, [editorForm]);

  const editorWorkResult = useMemo(() => {
    const totalVideoCount = editorWorks.reduce((sum, w) => sum + w.videoCount, 0);
    const totalCopyCount = editorWorks.reduce((sum, w) => sum + w.copyCount, 0);
    const videoFee = totalVideoCount * 20;
    const copyFee = totalCopyCount * 5;
    const total = videoFee + copyFee;
    return { totalVideoCount, totalCopyCount, videoFee, copyFee, total };
  }, [editorWorks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">提成计算</h1>
          <p className="text-muted-foreground">按岗位规则计算提成与费用</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户选择</CardTitle>
          <CardDescription>选择用户后根据其岗位自动计算</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <Label>用户</Label>
            {loading ? (
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中...
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="请选择用户" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id || ''}>
                      {user.nickname || user.accountIdentifier}
                      <span className="text-muted-foreground ml-2">
                        ({user.roleCode === 'SALES' ? '销售' : user.roleCode === 'EDITOR' ? '剪辑师' : user.roleCode})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {userPosition === 'SALES' ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>销售业绩列表</CardTitle>
                  <CardDescription>添加多条业绩记录，自动汇总计算提成</CardDescription>
                </div>
                <Dialog open={salesDialogOpen} onOpenChange={setSalesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-1 h-4 w-4" />
                      新增业绩
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增业绩</DialogTitle>
                    </DialogHeader>
                    <Form {...performanceForm}>
                      <form onSubmit={performanceForm.handleSubmit(handleAddPerformance)} className="space-y-4">
                        <FormField
                          control={performanceForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>日期</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={performanceForm.control}
                          name="merchant"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>商家</FormLabel>
                              <FormControl>
                                <Input placeholder="请输入商家名称" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={performanceForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>金额（元）</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="请输入金额" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={performanceForm.control}
                          name="months"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>月数</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="请输入月数" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setSalesDialogOpen(false)}>
                            取消
                          </Button>
                          <Button type="submit">确定</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {performances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无业绩记录，点击上方"新增业绩"按钮添加
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead>商家</TableHead>
                      <TableHead className="text-right">金额</TableHead>
                      <TableHead className="text-right">月数</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performances.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.date}</TableCell>
                        <TableCell>{p.merchant}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="text-right">{p.months}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePerformance(p.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>提成计算结果</CardTitle>
              <CardDescription>2 万以内 8%，超出部分 10%</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">业绩总额</span>
                  <span>{formatCurrency(performanceResult.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">2 万以内业绩</span>
                  <span>{formatCurrency(performanceResult.base)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">2 万以内提成（8%）</span>
                  <span>{formatCurrency(performanceResult.baseCommission)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">超出 2 万业绩</span>
                  <span>{formatCurrency(performanceResult.extra)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">超出部分提成（10%）</span>
                  <span>{formatCurrency(performanceResult.extraCommission)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>提成总额</span>
                  <span>{formatCurrency(performanceResult.total)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPerformances([])}
                  disabled={performances.length === 0}
                >
                  清空业绩
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>手动计算</CardTitle>
              <CardDescription>直接输入业绩总额进行计算</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...salesForm}>
                <form className="space-y-4">
                  <FormField
                    control={salesForm.control}
                    name="performance"
                    render={({ field }) => (
                      <FormItem className="max-w-sm">
                        <FormLabel>销售业绩（元）</FormLabel>
                        <FormControl>
                          <Input placeholder="例如：35000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              <div className="rounded-md border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">2 万以内业绩</span>
                  <span>{formatCurrency(salesResult.base)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">2 万以内提成（8%）</span>
                  <span>{formatCurrency(salesResult.baseCommission)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">超出 2 万业绩</span>
                  <span>{formatCurrency(salesResult.extra)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">超出部分提成（10%）</span>
                  <span>{formatCurrency(salesResult.extraCommission)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>提成总额</span>
                  <span>{formatCurrency(salesResult.total)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => salesForm.reset({ performance: '' })}
                >
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>剪辑师工作记录</CardTitle>
                  <CardDescription>添加多条工作记录，自动汇总计算费用</CardDescription>
                </div>
                <Dialog open={editorDialogOpen} onOpenChange={setEditorDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-1 h-4 w-4" />
                      新增记录
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增工作记录</DialogTitle>
                    </DialogHeader>
                    <Form {...editorWorkForm}>
                      <form onSubmit={editorWorkForm.handleSubmit(handleAddEditorWork)} className="space-y-4">
                        <FormField
                          control={editorWorkForm.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>日期</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editorWorkForm.control}
                          name="videoCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>视频数量</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="请输入视频数量" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editorWorkForm.control}
                          name="copyCount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>文案数量</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="请输入文案数量" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editorWorkForm.control}
                          name="remark"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>备注</FormLabel>
                              <FormControl>
                                <Input placeholder="请输入备注（可选）" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2 pt-4">
                          <Button type="button" variant="outline" onClick={() => setEditorDialogOpen(false)}>
                            取消
                          </Button>
                          <Button type="submit">确定</Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {editorWorks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无工作记录，点击上方"新增记录"按钮添加
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日期</TableHead>
                      <TableHead className="text-right">视频数量</TableHead>
                      <TableHead className="text-right">文案数量</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead className="text-right">费用</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editorWorks.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>{w.date}</TableCell>
                        <TableCell className="text-right">{w.videoCount}</TableCell>
                        <TableCell className="text-right">{w.copyCount}</TableCell>
                        <TableCell>{w.remark || '-'}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(w.videoCount * 20 + w.copyCount * 5)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEditorWork(w.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>费用计算结果</CardTitle>
              <CardDescription>视频 20/个，文案 5/个</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">视频总数</span>
                  <span>{editorWorkResult.totalVideoCount} 个</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">文案总数</span>
                  <span>{editorWorkResult.totalCopyCount} 个</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">视频费用（20/个）</span>
                  <span>{formatCurrency(editorWorkResult.videoFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">文案费用（5/个）</span>
                  <span>{formatCurrency(editorWorkResult.copyFee)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>总额</span>
                  <span>{formatCurrency(editorWorkResult.total)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditorWorks([])}
                  disabled={editorWorks.length === 0}
                >
                  清空记录
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>手动计算</CardTitle>
              <CardDescription>直接输入数量进行计算</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...editorForm}>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                    <FormField
                      control={editorForm.control}
                      name="videoCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>视频数量</FormLabel>
                          <FormControl>
                            <Input placeholder="例如：12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editorForm.control}
                      name="copyCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>文案数量</FormLabel>
                          <FormControl>
                            <Input placeholder="例如：8" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>

              <div className="rounded-md border p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">视频费用（20/个）</span>
                  <span>{formatCurrency(editorResult.videoFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">文案费用（5/个）</span>
                  <span>{formatCurrency(editorResult.copyFee)}</span>
                </div>
                <div className="pt-2 border-t flex justify-between font-semibold">
                  <span>总额</span>
                  <span>{formatCurrency(editorResult.total)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => editorForm.reset({ videoCount: '0', copyCount: '0' })}
                >
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}