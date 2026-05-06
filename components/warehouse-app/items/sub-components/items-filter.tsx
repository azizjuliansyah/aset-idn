import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCategories } from '@/hooks/queries/use-categories'
import { useWarehouses } from '@/hooks/queries/use-warehouses'
import { useItemConditions } from '@/hooks/queries/use-conditions'

interface ItemsFilterProps {
  warehouseId: string
  setWarehouseId: (v: string) => void
  categoryId: string
  setCategoryId: (v: string) => void
  conditionId: string
  setConditionId: (v: string) => void
  stockStatus: string
  setStockStatus: (v: string) => void
}

export function ItemsFilter({
  warehouseId,
  setWarehouseId,
  categoryId,
  setCategoryId,
  conditionId,
  setConditionId,
  stockStatus,
  setStockStatus,
}: ItemsFilterProps) {
  const { data: warehouses } = useWarehouses()
  const { data: categories } = useCategories()
  const { data: conditions } = useItemConditions()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gudang</Label>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Semua Gudang" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Gudang</SelectItem>
            {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kategori</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Semua Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kondisi</Label>
        <Select value={conditionId} onValueChange={setConditionId}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Semua Kondisi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kondisi</SelectItem>
            {conditions?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Stok</Label>
        <Select value={stockStatus} onValueChange={setStockStatus}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Semua Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="above_min">Di Atas Batas Minimum</SelectItem>
            <SelectItem value="below_min">Di Bawah Batas Minimum</SelectItem>
            <SelectItem value="out_of_stock">Tidak Tersedia</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
