# Painel de Planejamento de Férias

Este é um painel simples de planejamento de férias criado em HTML, CSS e JavaScript puro. O sistema permite cadastrar funcionários, registrar períodos de férias, controlar saldo de dias e exibir alertas de férias próximas.

## Funcionalidades

- Cadastro de funcionários com nome, matrícula, supervisor, data de admissão e saldo de dias de férias
- Registro de períodos de férias com data de início, fim, status, etiqueta e observações
- Desconto automático do saldo de férias ao lançar um período
- Permite saldo negativo com alerta para gestão
- Permite edição e exclusão de períodos de férias
- Não exibe períodos já finalizados na lista de próximas férias
- Crédito anual automático de 30 dias ao completar mais um ano de admissão
- Exportação e importação de dados em JSON
- Armazena os dados no `localStorage` do navegador

## Estrutura do projeto

- `index.html` — interface do aplicativo
- `style.css` — estilos visuais
- `script.js` — lógica de cadastro, cálculo de saldo e renderização

## Como usar

1. Abra `index.html` no navegador.
2. Cadastre um funcionário pressionando "Cadastrar funcionário".
3. Preencha os campos obrigatórios e salve.
4. Cadastre períodos de férias no formulário de férias.
5. Use o botão de exportar/importar JSON para salvar ou carregar dados.

## Dados armazenados

Os dados são salvos automaticamente no `localStorage` do navegador, usando a chave:

- `painel_ferias_ssl_clean_v1`
- `painel_ferias_ssl_alertas_v1`

## Observações

- Se o funcionário não tiver saldo suficiente, o sistema permite o lançamento e deixa o saldo negativo.
- O crédito de férias é aplicado automaticamente ao carregar ou atualizar os dados quando o funcionário completa mais um ano de admissão.

## Requisitos

- Navegador moderno com suporte a JavaScript

## Desenvolvedor

Projeto criado para gerenciamento simples de férias em ambiente frontend estático.
