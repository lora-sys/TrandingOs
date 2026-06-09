import { Button } from "@heroui/react/button";
import { Card } from "@heroui/react/card";
import { Chip } from "@heroui/react/chip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ClipboardList, GraduationCap, Play, ShieldCheck } from "lucide-react";
import { tradingPiApi } from "../api/client.js";
import { useSession } from "../components/session.js";

const steps = [
  { title: "入门学习", command: "/bootstrap-os", note: "建立 BTC/ETH/Macro 工作区与本地目录" },
  { title: "模拟练习", command: "/plan ETH/USDT 100 spot", note: "先生成交易计划和风险报告" },
  { title: "策略研究", command: "/research ETH", note: "通过 Research Hub 生成带来源的报告" },
  { title: "实盘准备", command: "/browser search ETH market risks", note: "浏览器证据必须走 AIO Sandbox" },
  { title: "小额交易", command: "paper only", note: "默认 mock/paper，live_guarded 需要审批" },
  { title: "持续复盘", command: "/review-day", note: "Journal + Review + Memory 进入进化循环" },
];

export function BeginnerJourneyPage() {
  const { sessionId, setSessionId } = useSession();
  const queryClient = useQueryClient();
  const run = useMutation({
    mutationFn: async (command: string): Promise<{ sessionId: string }> => command === "paper only"
      ? tradingPiApi.createPaperOrder({ symbol: "ETH/USDT", side: "buy", quantity: 0.01, price: 100 }, sessionId)
      : tradingPiApi.sendMessage(command, sessionId),
    onSuccess: async (result) => {
      setSessionId(result.sessionId);
      await queryClient.invalidateQueries();
    },
  });

  return (
    <section className="pageStack">
      <header className="pageHeader">
        <div>
          <h1>Beginner Journey</h1>
          <p>From learning to paper execution, review, and guarded evolution.</p>
        </div>
        <Chip variant="solid" color="success">paper-first</Chip>
      </header>
      <Card className="heroPanel">
        <Card.Header className="panelTitle"><GraduationCap size={16} /> Trading Pi Growth Route</Card.Header>
        <div className="journeyGrid">
          {steps.map((step, index) => (
            <div className="journeyStep" key={step.title}>
              <strong>{index + 1}. {step.title}</strong>
              <span>{step.note}</span>
              <Button size="sm" variant="secondary" isDisabled={run.isPending} onClick={() => run.mutate(step.command)}>
                {index < 2 ? <BookOpen size={14} /> : index < 4 ? <ClipboardList size={14} /> : <ShieldCheck size={14} />} {step.command}
              </Button>
            </div>
          ))}
        </div>
      </Card>
      {run.data && <article className="skillRunCard"><Play size={18} /><div><strong>Journey step executed</strong><p>The step ran through Trading Pi Agent, Workflow, Skill, or paper-only API.</p></div></article>}
    </section>
  );
}
