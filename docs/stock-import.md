# Stock import format

Upload a CSV UTF-8 file with this header:

```csv
S.No,Spare Name,Machine Type,Cost,Quantity,Vendor
1,Sewing needle,SNLS,10,100,
```

The first five columns are required. Vendor is optional and can be omitted entirely or left blank; the spelling `Vender` is also accepted.

- S.No must be a positive whole number, unique within the file and consistent for the same spare across imports.
- Cost is the price per item, and Quantity is the initial stock. Both must be non-negative numbers. Quantity uses `pcs` unless an optional `unit` column is included.
- Internal part IDs and SKUs are generated automatically from S.No. The older full stock CSV format is still accepted.
- Re-importing an existing S.No keeps its stock and cost unchanged. A non-empty Vendor updates the vendor; a blank Vendor preserves the existing value.
- Reusing an existing S.No for a different spare name or machine type is rejected. Preview performs validation without writing records.
- Import up to 2,000 rows / 2 MB per file. Download the updated template from **Import Stock**.
