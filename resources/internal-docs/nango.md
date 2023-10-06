## Nango integrations

We create one new integration for each Salesforce source. We could have one integration (e.g. `salesforce`) and then have different sync scripts, but we are not sure that for each Salesforce source, the scopes are necessarily the same, so we preferred to stick to the convention that one integration = one content type. It also makes the code more streamlined. We have this:

- Salesforce Knowledge
- Salesforce Case
- GitHub Repo
- GitHub Issues
- Website
- etc.

instead of this:

- Salesforce
  - Knowledge
  - Case
- GitHub
  - Repo
  - Issues
- Website
- etc.

Note that sync names need to be unique on Nango, so we cannot reuse the same sync script for e.g. `salesforce-knowledge` and `salesforce-knowledge-sandbox`.

In order to deploy, run via npm:

```
npm run nango-deploy-dev
```
