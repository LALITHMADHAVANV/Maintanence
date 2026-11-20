# Maintenance roles and service station repairs

Department names are matched case-insensitively. Spaces and hyphens are treated like underscores:

| Department/role name | Access |
| --- | --- |
| Head Mechanic Manager | Plant operations, all units, machines, imports, floor flow, and Manage Mechanics. No Settings or Telegram/department configuration. Can manage technical accounts, not administrator/manager accounts. |
| Senior Mechanic | Supervisor desk, team tasks, service repair follow-up, and supervisor navigation. |
| Service Mechanic | Mechanic desk and technician navigation, with assigned service repair due dates. |
| Mechanic | Mechanic desk and technician navigation. |
| Store | Store desk and stock/indent navigation. |
| Admin | Full administration including Settings. |

When adding or renaming a department in Settings, the navigation checklist automatically selects the routes permitted for its matched role. Administrators can uncheck items. Saving a department filters out menu paths outside its role permissions. This affects menu visibility; route and API permissions still apply independently.

Head Mechanic Managers manage technicians at `/:company/dashboard/users` instead of opening Settings. Staff can be added, edited, assigned units/zones, and marked inactive. Robert's Sahana account is migrated with `node scripts/update-robert-role.cjs --apply`; without `--apply`, the script only reports the matching account.

## Service handover

1. A mechanic opens **Assign Ticket to Colleague** and selects an active Service Mechanic in the machine's unit.
2. A repair due date appears, defaulting to 10 calendar days from today in India. The mechanic can choose another date today or later and enter handover instructions.
3. Confirming moves the machine to **Maintenance Workshop / Service Station**, marks it **UNDER_MAINTENANCE**, assigns the repair to the service mechanic, and records the movement and original location.
4. Seniors and the Head Mechanic Manager see **Service station repair follow-up** on their dashboards, including due dates, overdue repairs, and the latest saved follow-up note with author and time.
5. Completing or rejecting the repair removes it from the open service follow-up list. Physical return to a production line uses the existing machine movement flow.

The assignment, machine movement, and asset log are saved in one MongoDB transaction. MongoDB must support transactions (Atlas or a replica set). Conflicting machine/ticket changes reject the transfer without saving a partial move.

Deploy/restart the app for the new navigation and transfer behavior. Users should refresh or sign in again to load changed roles. No repair tickets or machines are migrated automatically.

## Unit scope and data display

Staff can be assigned **All Units** in Settings or Manage Mechanics. Zone selection is hidden and saved zones are cleared for that scope. The account can view work across units while retaining its role permissions; selecting All Units does not grant administrator rights.

The former My Tasks dashboard card now lists machines physically at the service station, including repaired machines awaiting return to the floor. The shared page overlay tracks concurrent application API requests until their response bodies finish, and clears on success, failure, or abort.

Runtime sample asset catalogs, generated fleet data, sample staff choices, and invented historical/financial fallback values are removed. Missing values use empty or not-recorded states. Allowance totals use recorded purchase/repair amounts and any stored `monthlyAllowance`; absent budgets are marked not configured. The availability report uses the zones and lines on actual machine records.
