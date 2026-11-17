import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Riffly" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última atualização: novembro de 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground">1. Quais dados coletamos</h2>
          <p className="mt-2">
            Coletamos o e-mail e, se você cadastrar, o nome de exibição informado na criação da
            conta. Também armazenamos as músicas que você marca como favoritas e o histórico de
            músicas visualizadas recentemente, para que essas informações fiquem disponíveis em
            qualquer dispositivo onde você fizer login.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. Como usamos esses dados</h2>
          <p className="mt-2">
            Usamos seus dados exclusivamente para autenticar sua conta, manter favoritos e
            recentes sincronizados, e permitir o login via Google quando essa opção é escolhida.
            Não usamos seus dados para fins publicitários.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. Cookies e armazenamento local</h2>
          <p className="mt-2">
            Utilizamos armazenamento local do navegador para manter sua sessão ativa entre
            visitas, evitando que você precise fazer login a cada acesso.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Compartilhamento com terceiros</h2>
          <p className="mt-2">
            Seus dados não são vendidos nem compartilhados com fins comerciais. Eles são
            processados pelo Supabase, provedor responsável pelo banco de dados e autenticação
            do Riffly, e, caso você use login via Google, pelo Google OAuth, apenas para
            confirmar sua identidade.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Armazenamento e segurança</h2>
          <p className="mt-2">
            Os dados são armazenados em servidores do Supabase, com conexões criptografadas e
            controle de acesso por função (usuário, administrador, dono). Senhas nunca são
            armazenadas em texto puro.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Seus direitos (LGPD)</h2>
          <p className="mt-2">
            Você pode solicitar a qualquer momento a confirmação, correção, portabilidade ou
            exclusão dos seus dados pessoais, entrando em contato pelo e-mail abaixo. Pedidos de
            exclusão de conta removem também seus favoritos e histórico associados.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Retenção de dados</h2>
          <p className="mt-2">
            Mantemos seus dados enquanto sua conta estiver ativa. Caso sua conta seja excluída,
            os dados pessoais associados são removidos, exceto quando a lei exigir retenção por
            prazo determinado.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Alterações nesta política</h2>
          <p className="mt-2">
            Esta política pode ser atualizada periodicamente para refletir mudanças no serviço ou
            na legislação aplicável. A data da última atualização está sempre indicada no topo
            desta página.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Contato</h2>
          <p className="mt-2">
            Para dúvidas sobre esta política ou para exercer seus direitos como titular de dados,
            entre em contato pelo e-mail{" "}
            <a href="mailto:contato@riffly.app.br" className="text-primary hover:underline">
              contato@riffly.app.br
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← Voltar para o início
        </Link>
      </p>
    </div>
  );
}
