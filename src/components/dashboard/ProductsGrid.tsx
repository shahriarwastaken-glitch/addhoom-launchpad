import { useState } from 'react';
import { Package, Plus, Pencil, X, ToggleLeft, ToggleRight } from 'lucide-react';
import type { WorkspaceProduct } from '@/hooks/useWorkspaceProducts';

type ProductsGridProps = {
  products: WorkspaceProduct[];
  onToggleActive: (id: string, active: boolean) => void;
  onEdit: (product: WorkspaceProduct) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

const ProductsGrid = ({ products, onToggleActive, onEdit, onDelete, onAdd }: ProductsGridProps) => {
  const activeCount = products.filter(p => p.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Package size={18} className="text-primary" />
          {products.length} Products Found
        </h3>
        <button
          onClick={onAdd}
          className="text-sm text-primary font-semibold flex items-center gap-1 hover:underline"
        >
          <Plus size={14} /> Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-2xl">
          <Package size={32} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">No products extracted</p>
          <button
            onClick={onAdd}
            className="text-sm bg-primary text-primary-foreground rounded-full px-4 py-2 font-semibold"
          >
            Add Product Manually
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.map(product => (
            <div
              key={product.id}
              className={`group bg-card rounded-xl border overflow-hidden transition-all ${
                product.is_active ? 'border-border' : 'border-border opacity-60'
              }`}
            >
              {/* Image */}
              <div className="aspect-square relative bg-secondary overflow-hidden">
                {product.primary_image_url ? (
                  <img
                    src={product.primary_image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={28} className="text-muted-foreground" />
                  </div>
                )}
                {/* Hover actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEdit(product)}
                    className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-foreground hover:bg-white"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(product.id)}
                    className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-destructive hover:bg-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                  {product.name}
                </p>
                <div className="flex items-center justify-between mt-2">
                  {product.price_bdt ? (
                    <div className="flex items-baseline gap-1">
                      {product.original_price_bdt && product.original_price_bdt > product.price_bdt && (
                        <span className="text-[11px] text-muted-foreground line-through font-mono">
                          ৳{product.original_price_bdt.toLocaleString()}
                        </span>
                      )}
                      <span className="text-sm font-bold text-primary font-mono">
                        ৳{product.price_bdt.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No price</span>
                  )}
                  <button
                    onClick={() => onToggleActive(product.id, !product.is_active)}
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      product.is_active ? 'text-[hsl(var(--brand-green))]' : 'text-muted-foreground'
                    }`}
                  >
                    {product.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    {product.is_active ? 'Active' : 'Off'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {activeCount} active product{activeCount !== 1 ? 's' : ''} will be used in ad generation
      </p>
    </div>
  );
};

export default ProductsGrid;

// ── Product Edit Modal ──
export const ProductEditModal = ({
  product, onSave, onClose,
}: {
  product: Partial<WorkspaceProduct> | null;
  onSave: (data: Partial<WorkspaceProduct>) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price_bdt: product?.price_bdt || '',
    original_price_bdt: product?.original_price_bdt || '',
    primary_image_url: product?.primary_image_url || '',
    tags: (product?.tags || []).join(', '),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave({
      name: form.name,
      description: form.description || null,
      price_bdt: form.price_bdt ? Number(form.price_bdt) : null,
      original_price_bdt: form.original_price_bdt ? Number(form.original_price_bdt) : null,
      primary_image_url: form.primary_image_url || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">
            {product?.id ? 'Edit Product' : 'Add Product'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
              placeholder="Product name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-foreground resize-none"
              placeholder="Product description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Price (৳)</label>
              <input
                type="number"
                value={form.price_bdt}
                onChange={e => setForm(f => ({ ...f, price_bdt: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
                placeholder="1500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Original (৳)</label>
              <input
                type="number"
                value={form.original_price_bdt}
                onChange={e => setForm(f => ({ ...f, original_price_bdt: e.target.value }))}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
                placeholder="2000"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Image URL</label>
            <input
              value={form.primary_image_url}
              onChange={e => setForm(f => ({ ...f, primary_image_url: e.target.value }))}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Tags (comma separated)</label>
            <input
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-foreground"
              placeholder="eid collection, sale, new arrival"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!form.name.trim()}
          className="w-full bg-gradient-cta text-primary-foreground rounded-xl py-3 font-semibold disabled:opacity-50"
        >
          {product?.id ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
    </div>
  );
};
