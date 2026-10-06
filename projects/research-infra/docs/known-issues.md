# Known Issues

## Granting research access is a manual step

**Error:** No error. A missing workflow.

**Where:** The whole stack, which provisions one BigQuery view (`src/marts/bigquery.ts`). The website's access-request form is handled by `website-emailer`, which sends emails.

**Root cause:** A researcher asks for access through the website form, and the request arrives as an email. Nothing in code turns an approved request into an IAM grant on the marts dataset, records who approved it, or removes the grant later. Access is granted by hand.

**Decision:** Not yet addressed. Tracked in [docs/todo.md](../../../docs/todo.md).

**If this ever needs to be fixed:** Keep approved grants as a list in stack config (principal, approver, expiry) and have the stack create a dataset-level IAM binding for each, with an IAM condition for the expiry. That gives an auditable record in version control without building an approval service.
