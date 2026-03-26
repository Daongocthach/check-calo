---
name: add-translations
description: Add or update i18n keys in both English and Arabic locale files
auto-invocable: true
triggers:
  - add translation
  - add i18n
  - translate text
  - add locale keys
  - update translations
---

# Add/Update Translations

Add or update i18n keys in both locale files simultaneously.

## Gather Information

Ask the user for:

1. **Keys to add** - either as a flat list or nested namespace
2. **English text** for each key
3. **Arabic text** (optional - will generate best-effort if not provided)
4. **Namespace** (e.g., "products", "auth", "validation") - where to place the keys

## Steps

### 1. Read Both Locale Files

Read the current contents of:

- `src/i18n/locales/en.json`
- `src/i18n/locales/ar.json`

### 2. Determine Key Placement

Keys follow dot-notation namespacing:

```json
{
  "namespace": {
    "keyName": "Value"
  }
}
```

**Standard namespaces in this project:**

- `common` - Shared action words (loading, cancel, save, delete, etc.)
- `tabs` - Tab bar labels
- `home` - Home screen content
- `settings` - Settings screen content
- `errors` - Error messages
- `validation` - Form validation messages
- `<feature>` - Feature-specific keys (products, orders, etc.)
- `fields` - Form field labels (shared across features)

### 3. Merge New Keys

- Add new keys under the correct namespace in BOTH files
- If the namespace doesn't exist, create it in both files
- Never overwrite existing keys unless explicitly asked to update them
- Maintain alphabetical ordering within namespaces where practical

### 4. Arabic Translations

For Arabic translations:

- Provide accurate translations for common UI terms
- Use formal Arabic (Modern Standard Arabic) as default
- For uncertain translations, provide a best-effort translation and add a `TODO` comment in the commit message listing uncertain keys
- RTL is handled at the app level - just provide the text, no RTL markers needed

**Common Arabic translations reference:**
| English | Arabic |
|---------|--------|
| Save | حفظ |
| Cancel | إلغاء |
| Delete | حذف |
| Edit | تعديل |
| Submit | إرسال |
| Search | بحث |
| Loading... | جارٍ التحميل... |
| Error | خطأ |
| Success | نجاح |
| Required | مطلوب |
| Settings | الإعدادات |
| Profile | الملف الشخصي |
| Notifications | الإشعارات |
| Back | رجوع |
| Next | التالي |
| Done | تم |
| Retry | إعادة المحاولة |
| Close | إغلاق |
| Confirm | تأكيد |
| No items found | لا توجد عناصر |
| Add new | إضافة جديد |
| Created successfully | تم الإنشاء بنجاح |
| Updated successfully | تم التحديث بنجاح |
| Deleted successfully | تم الحذف بنجاح |

### 5. Verify Key Structure Sync

After editing, verify both files have **identical key structures**. Every key in `en.json` must exist in `ar.json` and vice versa. The values differ (different languages) but the shape must match exactly.

### 6. Show Summary

Report what was added/changed:

```
Added to "products" namespace:
  - products.title: "Products" / "المنتجات"
  - products.empty: "No products found" / "لا توجد منتجات"
  - products.addNew: "Add Product" / "إضافة منتج"

Files modified:
  - src/i18n/locales/en.json
  - src/i18n/locales/ar.json
```

## Critical Rules

- ALWAYS update BOTH `en.json` and `ar.json` simultaneously
- Both files MUST have identical key structures (same keys, different values)
- Validation messages are stored under `"validation"` namespace
- Never remove existing keys unless explicitly asked
- All values are plain strings - no HTML, no interpolation syntax (unless using i18next interpolation `{{variable}}`)
- Keep JSON properly formatted
- Use semantic, descriptive key names: `products.deleteConfirm` not `products.msg1`
