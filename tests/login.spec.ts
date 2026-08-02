import { test, expect } from '@playwright/test';

test.describe('Tela de Login', () => {
  const loginUrl = process.env.TEST_URL || 'http://localhost:3000/sign-in';

  test('deve carregar a página de login corretamente', async ({ page }) => {
    await page.goto(loginUrl);
    
    // Verificar se o título "GHOST BOT" está presente
    await expect(page.locator('text=GHOST BOT').first()).toBeVisible();
    
    // Verificar se os campos de input estão presentes
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Verificar se o botão de acessar painel está presente
    await expect(page.locator('button:has-text("Acessar painel")')).toBeVisible();
  });

  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto(loginUrl);
    
    // Preencher campos com dados inválidos
    await page.fill('input[type="email"]', 'usuario-invalido@teste.com');
    await page.fill('input[type="password"]', 'senha123456');
    
    // Clicar no botão de login
    await page.click('button:has-text("Acessar painel")');
    
    // Como estamos em um ambiente de teste sem backend real rodando perfeitamente,
    // esperamos que apareça uma mensagem de erro (ou timeout se o backend falhar)
    // O sistema usa 'sonner' ou um alerta customizado para erros
    const errorMsg = page.locator('div:has-text("Credenciais inválidas"), div:has-text("Erro")');
    await expect(errorMsg.first()).toBeVisible({ timeout: 10000 });
  });

  test('deve alternar a visibilidade da senha', async ({ page }) => {
    await page.goto(loginUrl);
    
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Clicar no botão que contém o ícone de olho (é o botão absoluto posicionado à direita no container)
    await page.locator('div.relative.flex.items-center button.absolute.right-3\\.5').click();
    
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
