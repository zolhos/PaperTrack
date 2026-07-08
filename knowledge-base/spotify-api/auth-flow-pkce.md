# Spotify OAuth 2.0 com PKCE (Proof Key for Code Exchange)

Para aplicações estáticas de cliente único (Single Page Applications - SPAs) como as hospedadas no GitHub Pages, o fluxo de PKCE é o padrão de segurança recomendado pela IETF e pelo Spotify para obter tokens de acesso sem a necessidade de expor o `client_secret`.

## Mecanismo de Funcionamento

1.  **Geração do Code Verifier:** A aplicação gera uma string aleatória criptográfica de alta entropia (comprimento entre 43 e 128 caracteres) chamada `code_verifier`.
2.  **Geração do Code Challenge:** A aplicação calcula o hash SHA-256 do `code_verifier` e o codifica em Base64 URL-safe. Esta string é o `code_challenge`.
3.  **Redirecionamento para Autenticação:** A aplicação redireciona o usuário para o Spotify Authorization Server, enviando o `client_id`, `redirect_uri`, `code_challenge_method: "S256"`, e o `code_challenge`.
4.  **Autorização e Callback:** O usuário aceita os termos e é redirecionado de volta para a aplicação com um parâmetro `code` na URL.
5.  **Troca de Código por Token:** A aplicação envia uma requisição `POST` diretamente para o Spotify Token Server contendo o `client_id`, o `code` de callback, a `redirect_uri`, e o `code_verifier` original.
6.  **Validação e Emissão de Token:** O servidor de autenticação do Spotify valida o `code_verifier` comparando-o com o `code_challenge` enviado no passo 3. Se coincidir, ele emite o `access_token` e o `refresh_token`.

## Vantagens
*   **Zero Segredos no Cliente:** O `client_secret` nunca é enviado ao frontend nem exposto no código fonte estático compilado.
*   **Proteção de Interceptação:** Mesmo que o código de autorização intermediário seja interceptado na URL, um invasor não conseguirá trocá-lo pelo token sem possuir o `code_verifier` original de etapa única.
