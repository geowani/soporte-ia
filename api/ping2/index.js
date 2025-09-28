export default async function (context, req) {
  context.res = { jsonBody: { ok: true, env: Object.keys(process.env).length } };
}
