# Troubleshooting

## npm install fails with 403
If you see a 403 from `registry.npmjs.org`, the environment is blocking access to the registry.

**Fix:**
1. Confirm the registry setting:
   ```bash
   npm config set registry https://registry.npmjs.org/
   ```
2. Clear proxy variables that can interfere with npm:
   ```bash
   unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
   ```
3. Retry install:
   ```bash
   npm install
   ```

The repo includes a `.npmrc` with retry settings to improve reliability on slow networks.
