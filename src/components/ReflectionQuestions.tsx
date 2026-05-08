import type { ReflectionPrompt } from "@/types/reel";

type ReflectionQuestionsProps = {
  questions: string[];
  prompts?: ReflectionPrompt[];
};

export function ReflectionQuestions({ questions, prompts = [] }: ReflectionQuestionsProps) {
  return (
    <section className="glass-card rounded-[2rem] p-6 md:p-8">
      <p className="text-sm uppercase tracking-[0.4em] text-polar-violet">Direction Check</p>
      <h2 className="mt-3 text-2xl font-bold text-polar-text">창작 방향 점검</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-polar-muted">
        감지된 반복 신호와 형식 변화를 바탕으로, 현재 창작 방향을 점검할 질문을 생성했습니다.
      </p>

      {prompts.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {prompts.map((prompt) => (
            <article key={prompt.title} className="rounded-3xl border border-polar-line bg-polar-panel/80 p-5">
              <h3 className="text-base font-semibold text-polar-text">{prompt.title}</h3>
              <p className="mt-3 text-sm leading-6 text-polar-muted">{prompt.basis}</p>
              <div className="mt-4 rounded-2xl bg-polar-panelSoft/70 p-4 text-sm leading-6 text-polar-text">
                {prompt.question}
              </div>
              <p className="mt-3 text-xs leading-5 text-polar-muted">확인 기준: {prompt.checkPoint}</p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3">
        {questions.map((question) => (
          <div key={question} className="rounded-2xl border border-polar-line bg-polar-panel/70 px-4 py-3 text-sm text-polar-muted">
            {question}
          </div>
        ))}
      </div>
    </section>
  );
}
