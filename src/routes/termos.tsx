// Página de Termos de Uso (texto genérico de exemplo).
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Riffly" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Termos de Uso</h1>
      <p className="mt-2 text-sm text-muted-foreground">Última atualização: novembro de 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground">1. Aceitação dos termos</h2>
          <p className="mt-2">
            Ao acessar ou usar o Riffly, você concorda com estes Termos de Uso. Se você não
            concordar com qualquer parte destes termos, pedimos que não utilize a plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. Descrição do serviço</h2>
          <p className="mt-2">
            O Riffly é uma plataforma gratuita que reúne ferramentas para músicos, incluindo
            afinador, metrônomo, reconhecimento de músicas e uma biblioteca de cifras. O serviço
            é fornecido "como está", podendo ser alterado, suspenso ou descontinuado a qualquer
            momento, no todo ou em parte.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. Cadastro e conta de usuário</h2>
          <p className="mt-2">
            Algumas funcionalidades exigem a criação de uma conta, feita com e-mail e senha ou
            login via Google. Você é responsável por manter a confidencialidade das suas
            credenciais e por todas as atividades realizadas na sua conta.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Uso adequado</h2>
          <p className="mt-2">
            Você concorda em não usar o Riffly para fins ilegais, para enviar conteúdo ofensivo,
            para tentar acessar áreas restritas da plataforma sem autorização, ou para
            sobrecarregar deliberadamente nossos serviços (incluindo o reconhecimento de áudio).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Conteúdo enviado por usuários</h2>
          <p className="mt-2">
            Pedidos de música e outras sugestões enviadas por usuários podem ser utilizados,
            editados ou recusados a critério da equipe do Riffly, sem obrigação de resposta
            individual a cada solicitação.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Propriedade intelectual</h2>
          <p className="mt-2">
            A marca, o layout e o código do Riffly pertencem aos seus desenvolvedores. Cifras e
            letras exibidas na plataforma pertencem aos seus respectivos autores e são
            disponibilizadas apenas para fins de estudo e prática musical.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Limitação de responsabilidade</h2>
          <p className="mt-2">
            O Riffly não garante disponibilidade ininterrupta nem total precisão das
            funcionalidades (como o reconhecimento automático de músicas) e não se
            responsabiliza por danos decorrentes do uso ou da impossibilidade de uso da
            plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Alterações nos termos</h2>
          <p className="mt-2">
            Estes termos podem ser atualizados periodicamente. O uso contínuo da plataforma após
            alguma alteração representa a aceitação dos novos termos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Legislação aplicável</h2>
          <p className="mt-2">
            Estes termos são regidos pelas leis da República Federativa do Brasil.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">10. Contato</h2>
          <p className="mt-2">
            Dúvidas sobre estes termos podem ser enviadas para{" "}
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
