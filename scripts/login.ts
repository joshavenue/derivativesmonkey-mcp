/** `npm run login`: same as the dm_login tool, from a terminal. */
import { login } from "../src/auth.js";
console.log(JSON.stringify(await login(), null, 2));
