// Re-export all product actions for convenience
export * from "./products-refactored"
// Explicitly re-export non-ambiguous items from products.ts
export {
  getProduct,
  createProduct,
  updateProduct,
  setProductStatus,
  duplicateProduct,
  deleteProduct,
  createCategory,
  deleteCategory,
} from "./products"
export type { ProductInput } from "./products"
export type { SortOption, FilterOption, ProductWithStats, ProductStats } from "./products-refactored"
