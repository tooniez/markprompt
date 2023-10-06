## Nango integrations

We create one new integration for each Salesforce source. We could have one integration (e.g. `salesforce`) and then have different sync scripts, but we are not sure that for each Salesforce source, the scopes are necessarily the same, so we preferred to stick to the convention that one integration = one content type. It also makes the code more streamlined. We have this:

- Salesforce Knowledge
- Salesforce Cases
- GitHub Repo
- GitHub Issues
- Website
- etc.

instead of this:

- Salesforce
  - Knowledge
  - Cases
- GitHub
  - Repo
  - Issues
- Website
- etc.
