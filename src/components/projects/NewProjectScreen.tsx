"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { DuoIcon } from "@/components/ui/DuoIcon";
import { Field } from "@/components/ui/Field";
import { HealthGauge } from "@/components/ui/HealthGauge";
import { LinkButton } from "@/components/ui/LinkButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import split from "@/components/layout/split.module.css";
import tones from "@/components/projects/project.module.css";
import type { ActionState } from "@/lib/action-state";
import { avatarTone } from "@/lib/avatar";

const steps = [
  { icon: "folder-add", title: "You create the project", text: "You become its owner and can change anything." },
  { icon: "task", title: "Add tasks and bugs", text: "Give them priorities and due dates so the score has real data." },
  { icon: "team", title: "Invite your team", text: "Choose a role for each person: admin, member or viewer." },
  { icon: "heart-pulse", title: "Watch the health score", text: "It starts at 100 and tells you what to fix when it drops." },
];

/** The new-project form with a live preview card that updates as you type. */
export function NewProjectScreen({ action }: { action: (prev: ActionState, formData: FormData) => Promise<ActionState> }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const shown = name.trim();

  return (
    <div className={split.split}>
      <section className={split.formCard} aria-labelledby="details-title">
        <h2 id="details-title">Project details</h2>
        <p className={split.formLead}>Give your project a clear name. You can change everything later.</p>
        <ActionForm action={action}>
          <Field name="name" label="Project name" required maxLength={100} autoFocus placeholder="e.g. Checkout rebuild" onValueChange={setName} />
          <Field name="description" label="Description" type="textarea" maxLength={1000} placeholder="What is this project about? Who is it for?" hint={`Optional. ${description.length}/1000`} onValueChange={setDescription} />
          <div className={split.row}>
            <SubmitButton large icon="ri-rocket-2-line" pendingLabel="Creating">Create project</SubmitButton>
            <LinkButton href="/projects" variant="secondary" large>Cancel</LinkButton>
          </div>
        </ActionForm>
      </section>

      <aside className={split.aside} aria-label="Preview and next steps">
        <div className={split.asideCard}>
          <h3>Live preview</h3>
          <div className={split.previewTop}>
            <span className={`${split.avatarBig} ${tones[`tone${avatarTone(shown || "P")}`]}`} aria-hidden="true">
              {(shown || "P").charAt(0).toUpperCase()}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className={`${split.previewName} ${shown ? "" : split.placeholder}`}>{shown || "Your project name"}</div>
              <div className={split.previewBand}>Healthy · starts at 100</div>
            </div>
            <HealthGauge score={100} band="healthy" size={64} />
          </div>
          <p className={split.previewDesc}>{description.trim() || "Your description will appear here."}</p>
          <div className={split.chips}>
            <span className={split.chip}><i className="ri-vip-crown-line" aria-hidden="true" /> You are the owner</span>
            <span className={split.chip}><i className="ri-list-check-2" aria-hidden="true" /> 0 tasks</span>
            <span className={split.chip}><i className="ri-team-line" aria-hidden="true" /> 1 member</span>
          </div>
        </div>

        <div className={split.asideCard}>
          <h3>What happens next</h3>
          <ol className={split.steps}>
            {steps.map((s) => (
              <li key={s.title}>
                <span className={split.stepIcon}><DuoIcon name={s.icon} size="1em" /></span>
                <div>
                  <div className={split.stepTitle}>{s.title}</div>
                  <div className={split.stepText}>{s.text}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
