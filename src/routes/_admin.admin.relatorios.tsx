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
import { toast } from "sonner";

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
          
          const absence = absences?.filter(a => a.employee_id === emp.id).find(a => a.absence_date === dateStr);
          
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

          // Split entries into 4 categories
          const entrada = dayEntries.find(e => e.entry_type === 'entrada')?.entry_at;
          const saidaAlmoco = dayEntries.find(e => e.entry_type === 'saida_almoco')?.entry_at;
          const retornoAlmoco = dayEntries.find(e => e.entry_type === 'retorno_almoco')?.entry_at;
          const saidaFinal = dayEntries.find(e => e.entry_type === 'saida')?.entry_at;

          const formatTime = (iso: string | undefined) => iso ? format(new Date(iso), "HH:mm") : "-";

          return {
            date: format(day, "dd/MM/yyyy"),
            weekday: format(day, "EEEE", { locale: ptBR }),
            entrada: formatTime(entrada),
            saidaAlmoco: formatTime(saidaAlmoco),
            retornoAlmoco: formatTime(retornoAlmoco),
            saidaFinal: formatTime(saidaFinal),
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
            "Entrada": d.entrada,
            "Saída Almoço": d.saidaAlmoco,
            "Retorno Almoço": d.retornoAlmoco,
            "Saída Final": d.saidaFinal,
            "Total": d.worked,
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
          
          if (logoDataUrl) {
            try {
              doc.addImage(logoDataUrl, "PNG", 14, 10, 20, 20);
            } catch (e) {
              console.error("Could not add image to PDF", e);
            }
          }
          
          doc.setTextColor(33, 150, 243);
          doc.setFontSize(22);
          doc.text("Relatório de Ponto", logoDataUrl ? 40 : 14, 20);
          
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(10);
          doc.text(profile?.tenant_name || "NexPonto", logoDataUrl ? 40 : 14, 28);
          
          doc.setDrawColor(230, 230, 230);
          doc.line(14, 35, 196, 35);

          doc.setTextColor(60, 60, 60);
          doc.setFontSize(12);
          doc.text(`Colaborador: ${rd.employee}`, 14, 45);
          doc.text(`Período: ${month}`, 14, 51);

          doc.setFillColor(245, 247, 250);
          doc.roundedRect(14, 58, 182, 25, 3, 3, "F");
          
          doc.setFontSize(10);
          doc.text("Total Trabalhado", 20, 68);
          doc.setFontSize(12);
          doc.text(rd.totalWorked, 20, 76);

          doc.setFontSize(10);
          doc.text("Total Esperado", 80, 68);
          doc.setFontSize(12);
          doc.text(rd.totalExpected, 80, 76);

          doc.setFontSize(10);
          doc.text("Saldo de Horas", 140, 68);
          doc.setFontSize(14);
          const isNegative = rd.balance.startsWith("-");
          doc.setTextColor(isNegative ? 244 : 76, isNegative ? 67 : 175, isNegative ? 54 : 80);
          doc.text(rd.balance, 140, 76);

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
            startY: 90,
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
              }
            }
          });
          doc.setTextColor(60, 60, 60);
          doc.setFontSize(10);
          const finalY = (doc as any).lastAutoTable.finalY + 20;
          
          if (finalY > 250) doc.addPage();
          
          const signatureY = finalY > 250 ? 40 : finalY;
          
          doc.line(14, signatureY, 90, signatureY);
          doc.text(rd.employee, 14, signatureY + 5);
          doc.text("Colaborador", 14, signatureY + 10);
          
          doc.line(110, signatureY, 186, signatureY);
          doc.text(profile?.tenant_name || "Empresa", 110, signatureY + 5);
          doc.text("Representante Legal", 110, signatureY + 10);
        });
        doc.save(`Relatorio_Ponto_${month}.pdf`);
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
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
