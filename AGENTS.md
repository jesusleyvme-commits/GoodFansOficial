# GoodFans

Links de entrega com validação de acesso e rastreamento de conversão para a
Meta.

## Comandos

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção
npm run preview    # serve o build
npm run test       # testes (Vitest)
npm run test:watch # testes em modo interativo
npm run lint       # ESLint + Prettier
npm run format     # Prettier em modo escrita
```

## Regras do projeto

**Nunca editar arquivo-fonte com PowerShell.** O `Get-Content -Raw` do Windows
PowerShell 5.1 lê como windows-1252 quando o arquivo não tem BOM, e gravar de
volta em UTF-8 transforma cada acento em dois caracteres: `·` vira `Â·`. O
TypeScript continua compilando e os testes passam, então a falha só aparece na
tela. `src/encoding.test.ts` existe para pegar isso, e é por isso que ele falha
se aparecer mojibake ou BOM.

**Token da conta de anúncios não é variável de ambiente.** Ele é cifrado no
Postgres e nunca sai do banco durante o envio de eventos: a função
`track_delivery_conversion` descriptografa e chama a Meta por dentro. Não criar
caminho que devolva esse token ao app.

**A rota `/go` é a única superfície pública.** Ela roda como `anon`. Qualquer
outra função nova precisa de `authenticated`, e o `anon` não deve alcançar
função de administração.

## Banco

As migrações são aplicadas direto no projeto Supabase conectado; não há pasta
`supabase/migrations` neste repositório.

Funções de administração (`list_people`, `set_person_approval`,
`set_person_rejection`, `set_person_activation`, `delete_person`) são
`SECURITY DEFINER` e conferem `is_admin()` internamente. Ao criar uma nova,
revogar `EXECUTE` de `PUBLIC` e de `anon` **depois** do `CREATE` — o Supabase
tem `DEFAULT PRIVILEGES` que devolve o acesso em função nova do schema `public`.

Isolamento entre usuários é garantido por RLS: `models` por `owner_id`,
`delivery_links` por `creator_id`. Nada no app deve contornar isso.
