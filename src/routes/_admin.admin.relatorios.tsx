import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileDown, Loader2, FileSpreadsheet, File as FilePdf } from "lucide-react";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { normalizeWorkDays, worksOn, formatWorkDays } from "@/lib/work-days";
import { getBrazilNationalHoliday } from "@/lib/brazil-national-holidays";
// Dynamically imported below for performance
// import * as XLSX from "xlsx";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — NexPonto Admin" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [periodType, setPeriodType] = useState<"diario" | "semanal" | "mensal">("mensal");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [referenceDate, setReferenceDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [employeeId, setEmployeeId] = useState("all");

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, daily_hours, work_days, hire_date, active, tenants(default_daily_hours)")
        .eq("tenant_id", profile!.tenant_id)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const generateReport = async (reportFormat: "xlsx" | "pdf") => {
    setLoading(true);
    try {
      const monthlyRef = new Date(`${month}-01T12:00:00`);
      const ref = new Date(referenceDate + "T12:00:00");
      const startDate = periodType === "mensal" ? startOfMonth(monthlyRef) : periodType === "semanal" ? startOfWeek(ref, { weekStartsOn: 1 }) : ref;
      const endDate = periodType === "mensal" ? endOfMonth(monthlyRef) : periodType === "semanal" ? endOfWeek(ref, { weekStartsOn: 1 }) : ref;
      const periodLabel = periodType === "mensal" ? month : periodType === "semanal" ? `Semana_${format(startDate, "dd-MM")}_a_${format(endDate, "dd-MM-yyyy")}` : format(referenceDate, "dd-MM-yyyy");

      
      const query = supabase
        .from("time_entries")
        .select("id, entry_date, entry_at, entry_type, employee_id, notes, is_adjustment, employees(full_name, daily_hours)")
        .eq("tenant_id", profile!.tenant_id)
        .gte("entry_date", format(startDate, "yyyy-MM-dd"))
        .lte("entry_date", format(endDate, "yyyy-MM-dd"));

      if (employeeId !== "all") {
        query.eq("employee_id", employeeId);
      }

      const { data: entries, error } = await query;
      if (error) throw error;

      const { data: absences } = await supabase
        .from("absences")
        .select("id, absence_date, reason, employee_id")
        .eq("tenant_id", profile!.tenant_id)
        .gte("absence_date", format(startDate, "yyyy-MM-dd"))
        .lte("absence_date", format(endDate, "yyyy-MM-dd"));

      const employeesToReport = employeeId === "all"
        ? (employees || []).filter(e => e.active)
        : employees?.filter(e => e.id === employeeId) || [];

      const reportData = employeesToReport.map(emp => {
        const empEntries = entries?.filter(e => e.employee_id === emp.id) || [];
        const empAbsences = absences?.filter(a => a.employee_id === emp.id) || [];
        const effectiveDailyHours =
          emp.daily_hours ?? (emp as any).tenants?.default_daily_hours ?? 8;
        
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        
        let totalWorkedMinutes = 0;
        let totalExpectedMinutes = 0;
        let totalPlannedMinutes = 0;
        let expectedWorkDays = 0;
        let expectedWorkDaysToDate = 0;
        let nationalHolidaysOnSchedule = 0;
        const todayStr = format(new Date(), "yyyy-MM-dd");

        const dailyReports = days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayEntries = empEntries
            .filter(e => e.entry_date === dateStr)
            .filter(e => !(e.is_adjustment && e.notes?.startsWith("ABONO:")))
            .sort((a, b) => new Date(a.entry_at).getTime() - new Date(b.entry_at).getTime());
          
          const absence = absences?.filter(a => a.employee_id === emp.id).find(a => a.absence_date === dateStr);
          
          const entradaEntry = dayEntries.find(e => e.entry_type === "entrada");
          const saidaAlmocoEntry = dayEntries.find(e => e.entry_type === "saida_almoco");
          const retornoAlmocoEntry = dayEntries.find(e => e.entry_type === "retorno_almoco");
          const saidaEntry = [...dayEntries].reverse().find(e => e.entry_type === "saida");

          const minutesBetween = (start?: string, end?: string) => {
            if (!start || !end) return 0;
            const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60);
            return diff > 0 ? diff : 0;
          };

          let workedMinutes = 0;
          if (entradaEntry && saidaAlmocoEntry) {
            workedMinutes += minutesBetween(entradaEntry.entry_at, saidaAlmocoEntry.entry_at);
          }
          if (retornoAlmocoEntry && saidaEntry) {
            workedMinutes += minutesBetween(retornoAlmocoEntry.entry_at, saidaEntry.entry_at);
          }
          // Short schedules commonly use only entrada + saída.
          if (!saidaAlmocoEntry && !retornoAlmocoEntry && entradaEntry && saidaEntry) {
            workedMinutes = minutesBetween(entradaEntry.entry_at, saidaEntry.entry_at);
          }

          const empWorkDays = normalizeWorkDays((emp as any).work_days);
          const isWorkDay = worksOn(empWorkDays, day);
          const nationalHoliday = getBrazilNationalHoliday(dateStr);
          const hiredOnOrBefore =
            !emp.hire_date || dateStr >= String(emp.hire_date).slice(0, 10);

          if (isWorkDay && hiredOnOrBefore && nationalHoliday) {
            nationalHolidaysOnSchedule += 1;
          }

          const plannedMinutes = (!isWorkDay || !hiredOnOrBefore || absence || nationalHoliday)
            ? 0
            : effectiveDailyHours * 60;
          const isFutureDay = dateStr > todayStr;
          const expectedMinutes = isFutureDay ? 0 : plannedMinutes;

          if (plannedMinutes > 0) expectedWorkDays += 1;
          if (expectedMinutes > 0) expectedWorkDaysToDate += 1;

          totalWorkedMinutes += workedMinutes;
          totalPlannedMinutes += plannedMinutes;
          totalExpectedMinutes += expectedMinutes;

          const entrada = entradaEntry?.entry_at;
          const saidaAlmoco = saidaAlmocoEntry?.entry_at;
          const retornoAlmoco = retornoAlmocoEntry?.entry_at;
          const saidaFinal = saidaEntry?.entry_at;

          const formatTime = (iso: string | undefined) => iso ? format(new Date(iso), "HH:mm") : "-";
          const hasAnyPunch = dayEntries.length > 0;
          const hasCompleteShortSchedule = !!entradaEntry && !!saidaEntry && !saidaAlmocoEntry && !retornoAlmocoEntry;
          const hasCompleteFullSchedule = !!entradaEntry && !!saidaAlmocoEntry && !!retornoAlmocoEntry && !!saidaEntry;
          const hasIncompletePunches = hasAnyPunch && !hasCompleteShortSchedule && !hasCompleteFullSchedule;

          return {
            date: format(day, "dd/MM/yyyy"),
            weekday: format(day, "EEEE", { locale: ptBR }),
            entrada: formatTime(entrada),
            saidaAlmoco: formatTime(saidaAlmoco),
            retornoAlmoco: formatTime(retornoAlmoco),
            saidaFinal: formatTime(saidaFinal),
            worked: Math.floor(workedMinutes / 60) + ":" + String(Math.floor(workedMinutes % 60)).padStart(2, "0"),
            status: absence
              ? `Abono: ${absence.reason}`
              : !hiredOnOrBefore
                ? "Fora do vínculo"
                : !isWorkDay
                  ? "Folga (escala)"
                  : nationalHoliday
                    ? `Feriado nacional: ${nationalHoliday.name}`
                    : isFutureDay
                      ? "Previsto"
                    : hasIncompletePunches
                      ? "Marcações incompletas"
                      : workedMinutes > 0
                        ? "Presente"
                        : "Falta",
          };
        });

        const diff = totalWorkedMinutes - totalExpectedMinutes;
        
        return {
          employee: emp.full_name,
          totalWorked: Math.floor(totalWorkedMinutes / 60) + ":" + String(Math.floor(totalWorkedMinutes % 60)).padStart(2, "0"),
          totalExpected: Math.floor(totalExpectedMinutes / 60) + ":" + String(Math.floor(totalExpectedMinutes % 60)).padStart(2, "0"),
          totalPlanned: Math.floor(totalPlannedMinutes / 60) + ":" + String(Math.floor(totalPlannedMinutes % 60)).padStart(2, "0"),
          balance: (diff >= 0 ? "+" : "-") + Math.floor(Math.abs(diff) / 60) + ":" + String(Math.floor(Math.abs(diff) % 60)).padStart(2, "0"),
          dailyHours: effectiveDailyHours,
          weeklyHours: effectiveDailyHours * normalizeWorkDays((emp as any).work_days).length,
          expectedWorkDays,
          expectedWorkDaysToDate,
          nationalHolidaysOnSchedule,
          workDaysLabel: formatWorkDays((emp as any).work_days),
          dailyReports
        };
      });

      if (reportFormat === "xlsx") {
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();
        reportData.forEach(rd => {
          const ws = XLSX.utils.json_to_sheet(rd.dailyReports.map(d => ({
            "Data": d.date,
            "Dia": d.weekday,
            "Entrada": d.entrada,
            "Saída Almoço": d.saidaAlmoco,
            "Retorno Almoço": d.retornoAlmoco,
            "Saída Final": d.saidaFinal,
            "Total": d.worked,
            "Status": d.status
          })));
          
          XLSX.utils.sheet_add_aoa(ws, [
            [],
            ["Resumo do Período"],
            ["Escala", rd.workDaysLabel],
            ["Carga Diária", `${rd.dailyHours}h`],
            ["Jornada Semanal", `${rd.weeklyHours}h`],
            ["Dias Previstos no Período", rd.expectedWorkDays],
            ["Feriados Nacionais na Escala", rd.nationalHolidaysOnSchedule],
            ["Dias Esperados até Hoje", rd.expectedWorkDaysToDate],
            ["Carga Prevista no Período", rd.totalPlanned],
            ["Total Trabalhado", rd.totalWorked],
            ["Esperado até Hoje", rd.totalExpected],
            ["Saldo Apurado", rd.balance]
          ], { origin: -1 });

          XLSX.utils.book_append_sheet(wb, ws, rd.employee.substring(0, 30));
        });
        XLSX.writeFile(wb, `Relatorio_Ponto_${periodLabel}.xlsx`);
      } else {
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF();
        
        const loadImage = (url: string): Promise<string | null> => {
          return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(null);
                return;
              }
              ctx.drawImage(img, 0, 0);
              try {
                const dataURL = canvas.toDataURL("image/png");
                resolve(dataURL);
              } catch (e) {
                console.error("Error converting image to data URL", e);
                resolve(null);
              }
            };
            img.onerror = (e) => {
              console.error("Error loading image for PDF", e);
              resolve(null);
            };
            img.src = url;
          });
        };

        const logoDataUrl = profile?.tenant_logo_url ? await loadImage(profile.tenant_logo_url) : null;

        reportData.forEach((rd, index) => {
          if (index > 0) doc.addPage();
          
          // Reserved logo area: 45x45mm box at top-left, image scaled to fit while preserving aspect ratio
          const LOGO_BOX = { x: 14, y: 8, w: 45, h: 45 };
          let headerLeftX = 14;
          if (logoDataUrl) {
            try {
              const props = (doc as any).getImageProperties(logoDataUrl);
              const ratio = props.width / props.height;
              let w = LOGO_BOX.w;
              let h = LOGO_BOX.w / ratio;
              if (h > LOGO_BOX.h) {
                h = LOGO_BOX.h;
                w = LOGO_BOX.h * ratio;
              }
              const cx = LOGO_BOX.x + (LOGO_BOX.w - w) / 2;
              const cy = LOGO_BOX.y + (LOGO_BOX.h - h) / 2;
              doc.addImage(logoDataUrl, "PNG", cx, cy, w, h);
              headerLeftX = LOGO_BOX.x + LOGO_BOX.w + 6;
            } catch (e) {
              console.error("Could not add image to PDF", e);
            }
          }
          
          doc.setTextColor(33, 150, 243);
          doc.setFontSize(22);
          doc.text("Relatório de Ponto", headerLeftX, 22);
          
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(10);
          doc.text(profile?.tenant_name || "NexPonto", headerLeftX, 30);
          
          doc.setDrawColor(230, 230, 230);
          doc.line(14, 56, 196, 56);

          doc.setTextColor(60, 60, 60);
          doc.setFontSize(12);
          doc.text(`Colaborador: ${rd.employee}`, 14, 64);
          doc.text(`Período: ${periodLabel}`, 14, 70);

          doc.setFillColor(245, 247, 250);
          doc.roundedRect(14, 76, 182, 38, 3, 3, "F");

          doc.setTextColor(90, 90, 90);
          doc.setFontSize(9);
          doc.text(`Escala: ${rd.workDaysLabel}`, 20, 84);
          doc.text(`Carga diária: ${rd.dailyHours}h`, 80, 84);
          doc.text(`Jornada semanal: ${rd.weeklyHours}h`, 140, 84);
          doc.text(`Dias previstos: ${rd.expectedWorkDays}`, 20, 92);
          doc.text(`Feriados nac.: ${rd.nationalHolidaysOnSchedule}`, 80, 92);
          doc.text(`Previsto período: ${rd.totalPlanned}`, 140, 92);

          doc.setFontSize(10);
          doc.text("Total Trabalhado", 20, 101);
          doc.setFontSize(12);
          doc.text(rd.totalWorked, 20, 109);

          doc.setFontSize(10);
          doc.text("Esperado até Hoje", 80, 101);
          doc.setFontSize(12);
          doc.text(rd.totalExpected, 80, 109);

          doc.setFontSize(10);
          doc.text("Saldo Apurado", 140, 101);
          doc.setFontSize(14);
          const isNegative = rd.balance.startsWith("-");
          doc.setTextColor(isNegative ? 244 : 76, isNegative ? 67 : 175, isNegative ? 54 : 80);
          doc.text(rd.balance, 140, 109);

          const tableBody = rd.dailyReports.map(d => [
            d.date, 
            d.entrada, 
            d.saidaAlmoco, 
            d.retornoAlmoco, 
            d.saidaFinal, 
            d.worked, 
            d.status
          ]);

          autoTable(doc, {
            startY: 121,
            head: [["Data", "Entrada", "Almoço (S)", "Almoço (R)", "Saída", "Total", "Status"]],
            body: tableBody,
            theme: "grid",
            headStyles: { fillColor: [33, 150, 243], fontSize: 9, halign: 'center' },
            styles: { fontSize: 8, cellPadding: 2, valign: 'middle', halign: 'center' },
            columnStyles: {
              0: { cellWidth: 20 },
              6: { cellWidth: 40, halign: 'left' }
            },
            didParseCell: (data) => {
              if (data.column.index === 6 && data.cell.text[0]?.includes("Abono")) {
                data.cell.styles.textColor = [33, 150, 243];
                data.cell.styles.fontStyle = "bold";
              }
              if (data.column.index === 6 && data.cell.text[0] === "Falta") {
                data.cell.styles.textColor = [244, 67, 54];
                data.cell.styles.fontStyle = "bold";
              }
              if (data.column.index === 6 && data.cell.text[0] === "Marcações incompletas") {
                data.cell.styles.textColor = [245, 158, 11];
                data.cell.styles.fontStyle = "bold";
              }
              if (data.column.index === 6 && data.cell.text[0] === "Previsto") {
                data.cell.styles.textColor = [100, 116, 139];
                data.cell.styles.fontStyle = "bold";
              }
              if (data.column.index === 6 && data.cell.text[0]?.startsWith("Feriado nacional:")) {
                data.cell.styles.textColor = [37, 99, 235];
                data.cell.styles.fontStyle = "bold";
              }
              if (data.column.index === 6 && data.cell.text[0] === "Presente") {
                data.cell.styles.textColor = [46, 160, 67];
                data.cell.styles.fontStyle = "bold";
              }
            }
          });

          doc.setTextColor(60, 60, 60);
          doc.setFontSize(10);
          const finalY = (doc as any).lastAutoTable.finalY + 20;
          
          if (finalY > 250) doc.addPage();
          
          const signatureY = finalY > 250 ? 40 : finalY;
          
          // Assinatura do Colaborador
          doc.line(14, signatureY, 90, signatureY);
          const empText = rd.employee;
          const empWidth = doc.getTextWidth(empText);
          const empX = 14 + (76 - empWidth) / 2; // Center under 76pt line
          doc.text(empText, empX, signatureY + 6);
          
          const labelColab = "Colaborador";
          const labelColabWidth = doc.getTextWidth(labelColab);
          const labelColabX = 14 + (76 - labelColabWidth) / 2;
          doc.setFontSize(8);
          doc.text(labelColab, labelColabX, signatureY + 11);
          
          // Assinatura da Empresa
          doc.setFontSize(10);
          doc.line(110, signatureY, 186, signatureY);
          const tenantText = profile?.tenant_name || "Empresa";
          const tenantWidth = doc.getTextWidth(tenantText);
          const tenantX = 110 + (76 - tenantWidth) / 2;
          doc.text(tenantText, tenantX, signatureY + 6);
          
          const labelEmp = "Representante Legal";
          const labelEmpWidth = doc.getTextWidth(labelEmp);
          const labelEmpX = 110 + (76 - labelEmpWidth) / 2;
          doc.setFontSize(8);
          doc.text(labelEmp, labelEmpX, signatureY + 11);
        });
        doc.save(`Relatorio_Ponto_${periodLabel}.pdf`);
      }
      toast.success("Relatório gerado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar relatório: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="mb-6 md:mb-10">
        <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-2 md:mt-3 text-base md:text-xl font-medium">Gere e exporte relatórios de ponto detalhados.</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="glass-card border-border rounded-2xl md:rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="p-6 md:p-10 pb-4 md:pb-6 border-b border-border/20">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <FileDown className="h-6 w-6 text-primary" />
              Configurar Relatório
            </CardTitle>
            <CardDescription>Selecione o período e os colaboradores para exportação.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-10 space-y-6 md:space-y-8">
            <div className="space-y-2 md:space-y-3">
              <Label>Tipo de Relatório</Label>
              <Select value={periodType} onValueChange={(v) => setPeriodType(v as "diario" | "semanal" | "mensal")}>
                <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-border">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:space-y-3">
              <Label>{periodType === "mensal" ? "Mês de Referência" : periodType === "semanal" ? "Semana (qualquer dia da semana)" : "Data de Referência"}</Label>
              {periodType === "mensal" ? (
                <Input
                  type="month"
                  value={month}
                  onChange={(ev) => setMonth(ev.target.value)}
                  className="rounded-xl h-12 bg-muted/20 border-border"
                />
              ) : (
                <Input
                  type="date"
                  value={referenceDate}
                  onChange={(ev) => setReferenceDate(ev.target.value)}
                  className="rounded-xl h-12 bg-muted/20 border-border"
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-border">
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Funcionários</SelectItem>
                  {employees?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}{emp.active ? "" : " (inativo)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Button 
                onClick={() => generateReport("xlsx")} 
                disabled={loading}
                variant="outline"
                className="rounded-2xl h-16 font-extrabold tracking-tight text-[10px] border-2 gap-3"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5 text-success" />}
                Exportar Excel
              </Button>
              <Button 
                onClick={() => generateReport("pdf")} 
                disabled={loading}
                className="rounded-2xl h-16 font-extrabold tracking-tight text-[10px] gap-3 shadow-lg shadow-primary/20"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FilePdf className="h-5 w-5" />}
                Gerar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="glass-card p-6 md:p-10 rounded-2xl md:rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent">
             <h3 className="font-display text-lg md:text-xl font-bold mb-4 tracking-tight">Informações Importantes</h3>
             <ul className="text-xs md:text-sm text-muted-foreground space-y-4 md:space-y-5">
               <li className="flex items-start gap-2">
                 <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">1</div>
                 Os relatórios agora separam Entrada, Saída de Almoço, Retorno de Almoço e Saída Final em colunas distintas.
               </li>
               <li className="flex items-start gap-2">
                 <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">2</div>
                 Se o colaborador possuir menos ou mais registros, o sistema tentará encaixar os horários nos campos correspondentes por tipo.
               </li>
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">3</div>
                  O logo do seu escritório (definido no perfil) será exibido automaticamente no cabeçalho do PDF.
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">4</div>
                  Os dias fora da escala de cada colaborador aparecem como "Folga (escala)" e não geram horas esperadas.
                </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
