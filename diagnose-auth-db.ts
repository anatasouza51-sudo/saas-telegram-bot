import { pool } from "./lib/db"

async function diagnose() {
  const client = await pool.connect()
  try {
    const tables = ['user', 'account', 'session', 'twoFactor']
    console.log("=== DIAGNÓSTICO DE BANCO DE DADOS (AUTH) ===")
    
    for (const table of tables) {
      console.log(`\nEstrutura da tabela: ${table}`)
      const res = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = '${table}'
        ORDER BY ordinal_position
      `)
      
      if (res.rows.length === 0) {
        console.log(`  [!] TABELA NÃO ENCONTRADA`)
      } else {
        res.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type} (nullable=${row.is_nullable}, default=${row.column_default})`)
        })
      }
    }
    
    console.log("\n=== VERIFICAÇÃO DE DADOS ===")
    const userCount = await client.query('SELECT COUNT(*) FROM "user"')
    console.log(`Total de usuários: ${userCount.rows[0].count}`)
    
    const accountCount = await client.query('SELECT COUNT(*) FROM account')
    console.log(`Total de contas (credentials): ${accountCount.rows[0].count}`)
    
    const usersWithoutAccount = await client.query(`
      SELECT email FROM "user" 
      WHERE id NOT IN (SELECT "userId" FROM account)
    `)
    if (usersWithoutAccount.rows.length > 0) {
      console.log(`[!] Usuários sem conta vinculada: ${usersWithoutAccount.rows.map(u => u.email).join(', ')}`)
    } else {
      console.log("Todos os usuários possuem conta vinculada.")
    }

  } catch (err) {
    console.error("Erro no diagnóstico:", err)
  } finally {
    client.release()
    process.exit(0)
  }
}

diagnose()
