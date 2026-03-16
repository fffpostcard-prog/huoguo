import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Search, Edit, Trash2, Loader2, Link as LinkIcon } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { getPaginationPages } from '@/utils/pagination';
import type { TaxiReimbursement, TaxiReimbursementPageQueryParams, TaxiReimbursementQueryParams, SysUser } from '@/types';
import {
  queryTaxiReimbursementsWithPage,
  createTaxiReimbursement,
  updateTaxiReimbursement,
  deleteTaxiReimbursement,
} from '@/api/system/AdminTaxiReimbursement';
import { queryUsers } from '@/api/system/AdminSysUser';
import { toast } from 'sonner';

const taxiReimbursementSchema = z.object({
  userId: z.string().uuid('请输入有效的用户ID'),
  reimburseDate: z.string().min(1, '请选择报销日期'),
  destination: z.string().min(1, '请输入去哪里'),
  amount: z
    .string()
    .min(1, '请输入报销金额')
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, '报销金额必须为正数'),
  purpose: z.string().min(1, '请输入行程目的'),
  screenshotUrl: z
    .string()
    .url('请输入有效的URL')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

type TaxiReimbursementFormData = z.infer<typeof taxiReimbursementSchema>;

export default function TaxiReimbursementsPage() {
  const [records, setRecords] = useState<TaxiReimbursement[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visible, setVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TaxiReimbursement | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<TaxiReimbursement | null>(null);
  const [queryParams, setQueryParams] = useState<TaxiReimbursementPageQueryParams>({
    page: 0,
    size: 10,
  });
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [users, setUsers] = useState<SysUser[]>([]);

  const getTodayString = () => {
    return new Date().toISOString().slice(0, 10);
  };

  const form = useForm<TaxiReimbursementFormData>({
    resolver: zodResolver(taxiReimbursementSchema),
    defaultValues: {
      userId: '',
      reimburseDate: getTodayString(),
      destination: '',
      amount: '',
      purpose: '',
      screenshotUrl: '',
    },
  });

  const searchForm = useForm<TaxiReimbursementQueryParams>({
    defaultValues: {},
  });

  const loadUsers = async () => {
    try {
      const data = await queryUsers();
      setUsers(data);
    } catch (error: any) {
      toast.error(error.message || '加载用户列表失败');
    }
  };

  const getUserLabel = (user: SysUser) => {
    const idPart = user.id ? user.id.substring(0, 8) : '';
    const nickname = user.nickname || '';
    const account = user.accountIdentifier || '';
    const parts = [nickname, account, idPart && `(${idPart}...)`].filter(Boolean);
    return parts.join(' / ') || idPart || '未知用户';
  };

  // 处理排序点击
  const handleSort = (field: string) => {
    if (sortField === field) {
      // 同一字段：asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      // 不同字段：设置为 asc
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 加载报销列表
  const loadRecords = async () => {
    setLoading(true);
    try {
      const sortParam =
        sortField && sortDirection ? `${sortField},${sortDirection}` : undefined;

      const params: TaxiReimbursementPageQueryParams = {
        ...queryParams,
        page: currentPage - 1,
        size: pageSize,
        sort: sortParam,
      };
      const result = await queryTaxiReimbursementsWithPage(params);
      setRecords(result.data);
      setTotal(result.total);
    } catch (error: any) {
      toast.error(error.message || '加载打车报销列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [currentPage, pageSize, queryParams, sortField, sortDirection]);

  useEffect(() => {
    loadUsers();
  }, []);

  // 处理搜索
  const handleSearch = (values: TaxiReimbursementQueryParams) => {
    setQueryParams({
      ...values,
      page: 0,
      size: pageSize,
    });
    setCurrentPage(1);
  };

  // 处理重置
  const handleReset = () => {
    searchForm.reset();
    setQueryParams({
      page: 0,
      size: pageSize,
    });
    setCurrentPage(1);
  };

  // 打开新增/编辑弹窗
  const handleOpenModal = (record?: TaxiReimbursement) => {
    if (record) {
      setEditingRecord(record);
      form.reset({
        userId: record.userId,
        reimburseDate: record.reimburseDate,
        destination: record.destination,
        amount: record.amount != null ? String(record.amount) : '',
        purpose: record.purpose,
        screenshotUrl: record.screenshotUrl,
      });
    } else {
      setEditingRecord(null);
      form.reset({
        userId: '',
        reimburseDate: getTodayString(),
        destination: '',
        amount: '',
        purpose: '',
        screenshotUrl: '',
      });
    }
    setVisible(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setVisible(false);
    setEditingRecord(null);
    form.reset({});
  };

  // 保存报销记录
  const handleSave = async (values: TaxiReimbursementFormData) => {
    const payload: Omit<TaxiReimbursement, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: values.userId,
      reimburseDate: values.reimburseDate,
      destination: values.destination,
      amount: Number(values.amount),
      purpose: values.purpose,
      screenshotUrl: values.screenshotUrl || undefined,
    };

    try {
      if (editingRecord?.id) {
        await updateTaxiReimbursement(editingRecord.id, payload);
        toast.success('更新打车报销记录成功');
      } else {
        await createTaxiReimbursement(payload);
        toast.success('创建打车报销记录成功');
      }
      handleCloseModal();
      loadRecords();
    } catch (error: any) {
      toast.error(error.message || '操作失败');
    }
  };

  // 删除报销记录
  const handleDeleteConfirm = async () => {
    if (!recordToDelete?.id) return;
    try {
      await deleteTaxiReimbursement(recordToDelete.id);
      toast.success('删除打车报销记录成功');
      setRecordToDelete(null);
      loadRecords();
    } catch (error: any) {
      toast.error(error.message || '删除打车报销记录失败');
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">打车报销管理</h1>
          <p className="text-muted-foreground">管理系统中的打车报销记录</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          新增报销
        </Button>
      </div>

      {/* 搜索表单 */}
      <Card>
        <CardHeader>
          <CardTitle>搜索条件</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...searchForm}>
            <form onSubmit={searchForm.handleSubmit(handleSearch)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={searchForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === 'ALL' ? '' : value)}
                        value={field.value || 'ALL'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择用户" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ALL">全部用户</SelectItem>
                          {users.map((user) =>
                            user.id ? (
                              <SelectItem key={user.id} value={user.id}>
                                {getUserLabel(user)}
                              </SelectItem>
                            ) : null
                          )}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={searchForm.control}
                  name="reimburseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>报销日期</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          placeholder="请选择报销日期"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={searchForm.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>去哪里</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入目的地" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={searchForm.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>行程目的</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入行程目的" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  <Search className="mr-2 h-4 w-4" />
                  查询
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  重置
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 表格 */}
      <Card>
        <CardHeader>
          <CardTitle>报销列表</CardTitle>
          <CardDescription>共 {total} 条记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead
                    field="userId"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    用户ID
                  </SortableTableHead>
                  <SortableTableHead
                    field="reimburse_date"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    报销日期
                  </SortableTableHead>
                  <SortableTableHead
                    field="destination"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    去哪里
                  </SortableTableHead>
                  <SortableTableHead
                    field="amount"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    报销金额
                  </SortableTableHead>
                  <SortableTableHead
                    field="purpose"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    行程目的
                  </SortableTableHead>
                  <TableHead>截图地址</TableHead>
                  <SortableTableHead
                    field="created_at"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    创建时间
                  </SortableTableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-xs">
                        {record.userId?.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {record.reimburseDate || '-'}
                      </TableCell>
                      <TableCell>{record.destination}</TableCell>
                      <TableCell>{record.amount}</TableCell>
                      <TableCell>{record.purpose}</TableCell>
                      <TableCell>
                        {record.screenshotUrl ? (
                          <a
                            href={record.screenshotUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <LinkIcon className="h-3 w-3" />
                            查看
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{formatDate(record.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRecordToDelete(record)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Label htmlFor="page-size-select" className="text-sm">
                每页显示：
              </Label>
              <select
                id="page-size-select"
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                共 {total} 条记录
              </span>
            </div>
            {totalPages > 1 && (
              <Pagination className="sm:mx-0 sm:w-auto sm:justify-end">
                <PaginationContent className="flex-wrap">
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {getPaginationPages(currentPage, totalPages, 3).map((page, index) => (
                    <PaginationItem key={page === 'ellipsis' ? `ellipsis-${index}` : page}>
                      {page === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 新增/编辑弹窗 */}
      <Dialog open={visible} onOpenChange={setVisible}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? '编辑报销记录' : '新增报销记录'}</DialogTitle>
            <DialogDescription>
              {editingRecord ? '修改打车报销信息' : '创建新的打车报销记录'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>用户</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择用户" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) =>
                            user.id ? (
                              <SelectItem key={user.id} value={user.id}>
                                {getUserLabel(user)}
                              </SelectItem>
                            ) : null
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reimburseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>报销日期</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>去哪里</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入目的地" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>报销金额</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入报销金额" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>行程目的</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入行程目的" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="screenshotUrl"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>截图地址（可选）</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入截图URL" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  取消
                </Button>
                <Button type="submit">保存</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!recordToDelete}
        onOpenChange={(open) => !open && setRecordToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条打车报销记录吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

