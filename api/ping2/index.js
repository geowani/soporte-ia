// CommonJS (sin "export default")
module.exports = async function (context, req) {
  context.res = {
    status: 200,
    // Para Functions v4 puedes usar jsonBody, pero body también funciona:
    body: { ok: true, env: Object.keys(process.env).length }
  };
};
