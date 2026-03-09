import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type WorkspaceProduct = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  price_bdt: number | null;
  original_price_bdt: number | null;
  images: Array<{ url: string; is_primary: boolean }>;
  primary_image_url: string | null;
  category: string | null;
  tags: string[];
  source_url: string | null;
  is_active: boolean;
  display_order: number;
  ads_generated_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export function useWorkspaceProducts(activeOnly = true) {
  const { activeWorkspace } = useAuth();
  const [products, setProducts] = useState<WorkspaceProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('workspace-products', {
        body: { action: 'list', workspace_id: activeWorkspace.id, active_only: activeOnly },
      });
      if (data?.success) setProducts(data.products || []);
    } catch (e) {
      console.error('Failed to fetch products:', e);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, activeOnly]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const addProduct = async (product: Partial<WorkspaceProduct>) => {
    if (!activeWorkspace) return null;
    const { data } = await supabase.functions.invoke('workspace-products', {
      body: { action: 'add', workspace_id: activeWorkspace.id, product },
    });
    if (data?.success) {
      await fetchProducts();
      return data.product;
    }
    return null;
  };

  const updateProduct = async (productId: string, updates: Partial<WorkspaceProduct>) => {
    const { data } = await supabase.functions.invoke('workspace-products', {
      body: { action: 'update', product_id: productId, product: updates },
    });
    if (data?.success) await fetchProducts();
    return data?.success;
  };

  const deleteProduct = async (productId: string) => {
    const { data } = await supabase.functions.invoke('workspace-products', {
      body: { action: 'delete', product_id: productId, workspace_id: activeWorkspace?.id },
    });
    if (data?.success) await fetchProducts();
    return data?.success;
  };

  const reorderProducts = async (productIds: string[]) => {
    const { data } = await supabase.functions.invoke('workspace-products', {
      body: { action: 'reorder', product_ids: productIds, workspace_id: activeWorkspace?.id },
    });
    if (data?.success) await fetchProducts();
  };

  return { products, loading, fetchProducts, addProduct, updateProduct, deleteProduct, reorderProducts };
}
