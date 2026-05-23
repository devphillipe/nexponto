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
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_admin/admin/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — NexPonto Admin" }] }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data: profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [employeeId, setEmployeeId] = useState("all");

  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, daily_hours")
        .eq("tenant_id", profile!.tenant_id)
        .eq("active", true);
      if (error) throw error;
      return data;
    },
  });

  const generateReport = async (reportFormat: "xlsx" | "pdf") => {
    setLoading(true);
    try {
      const startDate = startOfMonth(new Date(month + "-01T12:00:00"));
      const endDate = endOfMonth(startDate);
      
      const query = supabase
        .from("time_entries")
        .select("*, employees(full_name, daily_hours)")
        .eq("tenant_id", profile!.tenant_id)
        .gte("entry_date", startDate.toISOString().split("T")[0])
        .lte("entry_date", endDate.toISOString().split("T")[0]);

      if (employeeId !== "all") {
        query.eq("employee_id", employeeId);
      }

      const { data: entries, error } = await query;
      if (error) throw error;

      const { data: absences } = await supabase
        .from("absences")
        .select("*")
        .eq("tenant_id", profile!.tenant_id)
        .gte("absence_date", startDate.toISOString().split("T")[0])
        .lte("absence_date", endDate.toISOString().split("T")[0]);

      const employeesToReport = employeeId === "all" 
        ? employees || []
        : employees?.filter(e => e.id === employeeId) || [];

      const reportData = employeesToReport.map(emp => {
        const empEntries = entries?.filter(e => e.employee_id === emp.id) || [];
        const empAbsences = absences?.filter(a => a.employee_id === emp.id) || [];
        
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        
        let totalWorkedMinutes = 0;
        let totalExpectedMinutes = 0;

        const dailyReports = days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayEntries = empEntries.filter(e => e.entry_date === dateStr)
            .sort((a, b) => new Date(a.entry_at).getTime() - new Date(b.entry_at).getTime());
          
          const absence = empAbsences.find(a => a.absence_date === dateStr);
          
          let workedMinutes = 0;
          if (dayEntries.length >= 2) {
             for(let i=0; i < dayEntries.length - 1; i += 2) {
                const inTime = new Date(dayEntries[i].entry_at);
                const outTime = new Date(dayEntries[i+1].entry_at);
                workedMinutes += (outTime.getTime() - inTime.getTime()) / (1000 * 60);
             }
          }

          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const expectedMinutes = (isWeekend || absence) ? 0 : (emp.daily_hours || 8) * 60;
          
          totalWorkedMinutes += workedMinutes;
          totalExpectedMinutes += expectedMinutes;

          return {
            date: format(day, "dd/MM/yyyy"),
            weekday: format(day, "EEEE", { locale: ptBR }),
            entries: dayEntries.map(e => format(new Date(e.entry_at), "HH:mm")).join(" | "),
            worked: Math.floor(workedMinutes / 60) + ":" + String(Math.floor(workedMinutes % 60)).padStart(2, "0"),
            status: absence ? `Abono: ${absence.reason}` : (workedMinutes > 0 ? "Presente" : (isWeekend ? "Fim de Semana" : "Falta")),
          };
        });

        const diff = totalWorkedMinutes - totalExpectedMinutes;
        
        return {
          employee: emp.full_name,
          totalWorked: Math.floor(totalWorkedMinutes / 60) + ":" + String(Math.floor(totalWorkedMinutes % 60)).padStart(2, "0"),
          totalExpected: Math.floor(totalExpectedMinutes / 60) + ":" + String(Math.floor(totalExpectedMinutes % 60)).padStart(2, "0"),
          balance: (diff >= 0 ? "+" : "-") + Math.floor(Math.abs(diff) / 60) + ":" + String(Math.floor(Math.abs(diff) % 60)).padStart(2, "0"),
          dailyReports
        };
      });

      if (reportFormat === "xlsx") {
        const wb = XLSX.utils.book_new();
        reportData.forEach(rd => {
          const ws = XLSX.utils.json_to_sheet(rd.dailyReports.map(d => ({
            "Data": d.date,
            "Dia": d.weekday,
            "Registros": d.entries,
            "Horas Trabalhadas": d.worked,
            "Status": d.status
          })));
          
          XLSX.utils.sheet_add_aoa(ws, [
            [],
            ["Resumo Mensal"],
            ["Total Trabalhado", rd.totalWorked],
            ["Total Esperado", rd.totalExpected],
            ["Saldo", rd.balance]
          ], { origin: -1 });

          XLSX.utils.book_append_sheet(wb, ws, rd.employee.substring(0, 30));
        });
        XLSX.writeFile(wb, `Relatorio_Ponto_${month}.xlsx`);
      } else {
        const doc = new jsPDF();
        reportData.forEach((rd, index) => {
          if (index > 0) doc.addPage();
          
          doc.setTextColor(33, 150, 243);
          doc.setFontSize(22);
          doc.text("Relatório de Ponto", 14, 20);
          
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(12);
          doc.text(`Colaborador: ${rd.employee}`, 14, 30);
          doc.text(`Período: ${month}`, 14, 36);

          doc.setFillColor(245, 247, 250);
          doc.roundedRect(14, 42, 182, 25, 3, 3, "F");
          
          doc.setFontSize(10);
          doc.text("Total Trabalhado", 20, 52);
          doc.setFontSize(12);
          doc.text(rd.totalWorked, 20, 60);

          doc.setFontSize(10);
          doc.text("Total Esperado", 80, 52);
          doc.setFontSize(12);
          doc.text(rd.totalExpected, 80, 60);

          doc.setFontSize(10);
          doc.text("Saldo de Horas", 140, 52);
          doc.setFontSize(14);
          const diffValue = rd.balance.startsWith("+") ? 1 : -1;
          doc.setTextColor(diffValue >= 0 ? 76 : 244, diffValue >= 0 ? 175 : 67, diffValue >= 0 ? 80 : 54);
          doc.text(rd.balance, 140, 60);

          autoTable(doc, {
            startY: 75,
            head: [["Data", "Dia", "Registros", "Total", "Status"]],
            body: rd.dailyReports.map(d => [d.date, d.weekday, d.entries, d.worked, d.status]),
            theme: "grid",
            headStyles: { fillColor: [33, 150, 243], fontSize: 10 },
            styles: { fontSize: 8 },
            didParseCell: (data) => {
              if (data.column.index === 4 && data.cell.text[0]?.includes("Abono")) {
                data.cell.styles.textColor = [33, 150, 243];
                data.cell.styles.fontStyle = "bold";
              }
              if (data.column.index === 4 && data.cell.text[0] === "Falta") {
                data.cell.styles.textColor = [244, 67, 54];
              }
            }
          });
        });
        doc.save(`Relatorio_Ponto_${month}.pdf`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground mt-2">Gere relatórios de ponto detalhados em Excel ou PDF.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card border-none rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <FileDown className="h-6 w-6 text-primary" />
              Configurar Relatório
            </CardTitle>
            <CardDescription>Selecione o período e os colaboradores para exportação.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <div className="space-y-2">
              <Label>Mês de Referência</Label>
              <Input 
                type="month" 
                value={month} 
                onChange={(ev) => setMonth(ev.target.value)} 
                className="rounded-xl h-12 bg-muted/20 border-border/40"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="rounded-xl h-12 bg-muted/20 border-border/40">
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Funcionários</SelectItem>
                  {employees?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button 
                onClick={() => generateReport("xlsx")} 
                disabled={loading}
                variant="outline"
                className="rounded-xl h-14 font-bold border-2 gap-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5 text-success" />}
                Exportar Excel
              </Button>
              <Button 
                onClick={() => generateReport("pdf")} 
                disabled={loading}
                className="rounded-xl h-14 font-bold gap-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FilePdf className="h-5 w-5" />}
                Gerar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="glass-card p-8 rounded-[2rem] border border-border/40 bg-primary/5">
             <h3 className="font-bold text-lg mb-2">Informações Importantes</h3>
             <ul className="text-sm text-muted-foreground space-y-3">
               <li className="flex items-start gap-2">
                 <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">1</div>
                 Relatórios em PDF incluem cores indicativas para saldo positivo (verde) e negativo (vermelho).
               </li>
               <li className="flex items-start gap-2">
                 <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">2</div>
                 Abonos registrados no sistema são descontados automaticamente da carga horária esperada.
               </li>
               <li className="flex items-start gap-2">
                 <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">3</div>
                 O arquivo Excel contém abas separadas para cada colaborador selecionado.
               </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}