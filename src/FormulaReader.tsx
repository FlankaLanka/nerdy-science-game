import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { CHAMBERS, FORMULAS } from "./chambers";
import { FORMULA_LESSONS } from "./formulaLessons";
import { TabletIcon } from "./TabletIcon";
import type { FormulaView } from "./scene/formulaView";
import "./formula-reader.css";

export function FormulaReader({ index, view, suspended, onClose, onNotebook }: {
  index: number;
  view: FormulaView | null;
  suspended: boolean;
  onClose: () => void;
  onNotebook: () => void;
}) {
  const id = CHAMBERS[index].formula!;
  const formula = FORMULAS[id], lesson = FORMULA_LESSONS[id];
  const page = useRef<HTMLElement>(null);
  const [more, setMore] = useState(true);
  const ready = view?.index === index;
  function updateScroll() {
    const el = page.current;
    if (el) setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 4);
  }
  useEffect(() => {
    if (ready && !suspended) page.current?.focus({ preventScroll: true });
  }, [ready, suspended]);
  useEffect(() => {
    if (!ready || suspended) return;
    updateScroll();
    const observer = new ResizeObserver(updateScroll);
    observer.observe(page.current!);
    return () => observer.disconnect();
  }, [ready, suspended]);
  return (
    <section className="formula-inspection" aria-label={`${formula.name} screen`} hidden={suspended}>
      <button className="formula-notebook" onClick={onNotebook} aria-label="Open notebook" title="Notebook · N">
        <TabletIcon /><kbd>N</kbd>
      </button>
      <button className="formula-close" onClick={onClose} aria-label="Leave formula screen" autoFocus>
        <X aria-hidden="true" /><kbd>Esc</kbd>
      </button>
      {ready && (
        <div className="formula-reader" style={{ left: view.left, top: view.top, width: view.width, height: view.height }}>
          <article className="formula-reading-page" ref={page} tabIndex={0} role="region" aria-label={`${formula.name} explanation`} onScroll={updateScroll}>
            <header>
              <h1>{formula.name}</h1>
              <p className="formula-reading-equation" aria-hidden="true">{formula.equation}</p>
              <p className="formula-spoken-equation">{lesson.spokenEquation}</p>
            </header>
            <section aria-label="What it means">
              <h2>What it means</h2>
              {lesson.meaning.map(text => <p key={text}>{text}</p>)}
            </section>
            <section aria-label="A quick example">
              <h2>A quick example</h2>
              {lesson.example.map(text => <p key={text}>{text}</p>)}
            </section>
            <section aria-label="At the bench">
              <h2>At the bench</h2>
              <p>{lesson.experiment}</p>
            </section>
          </article>
          <div className="formula-scroll-hint" aria-hidden="true">
            {more && <><span>Scroll to read</span><ChevronDown /></>}
          </div>
        </div>
      )}
    </section>
  );
}
