const XLSX = require('xlsx');
const path = require('path');

// Sample student data
const students = [
  { name: 'أحمد محمد علي', recitalType: 'نص كامل', surahRange: 'من الناس إلى النبأ', programName: 'البرنامج الأساسي', calendar: 'هجري', mistakesCount: '5', teacherName: 'الشيخ محمود' },
  { name: 'فاطمة عبدالله سالم', recitalType: 'نص مختصر', surahRange: 'سورة البقرة', programName: 'برنامج الراقيات', calendar: 'ميلادي', mistakesCount: '3', teacherName: 'الشيخة أم الحسن' },
  { name: 'عمر حسن إبراهيم', recitalType: 'نص كامل', surahRange: 'من الفاتحة إلى آل عمران', programName: 'البرنامج الأساسي', calendar: 'هجري', mistakesCount: '8', teacherName: 'الشيخ محمود' },
  { name: 'سارة يوسف محمد', recitalType: 'نص مختصر', surahRange: 'سورة يس', programName: 'برنامج متقدم', calendar: 'ميلادي', mistakesCount: '2', teacherName: 'الشيخة فرح' },
  { name: 'خالد علي أحمد', recitalType: 'نص كامل', surahRange: 'من النساء إلى الأنعام', programName: 'البرنامج الأساسي', calendar: 'هجري', mistakesCount: '6', teacherName: 'الشيخ أحمد' },
  { name: 'ليلى محمود حسن', recitalType: 'نص مختصر', surahRange: 'سورة الكهف', programName: 'برنامج الراقيات', calendar: 'ميلادي', mistakesCount: '4', teacherName: 'الشيخة أم الحسن' },
  { name: 'محمد صالح عبدالعزيز', recitalType: 'نص كامل', surahRange: 'من الأعراف إلى التوبة', programName: 'برنامج متقدم', calendar: 'هجري', mistakesCount: '7', teacherName: 'الشيخ محمود' },
  { name: 'مريم أحمد علي', recitalType: 'نص مختصر', surahRange: 'سورة مريم', programName: 'البرنامج الأساسي', calendar: 'ميلادي', mistakesCount: '1', teacherName: 'الشيخة فرح' },
  { name: 'حمد ناصر محمد', recitalType: 'نص كامل', surahRange: 'من يونس إلى يوسف', programName: 'برنامج الراقيات', calendar: 'هجري', mistakesCount: '9', teacherName: 'الشيخ أحمد' },
  { name: 'نور عبدالرحمن سالم', recitalType: 'نص مختصر', surahRange: 'سورة الشمس', programName: 'برنامج متقدم', calendar: 'ميلادي', mistakesCount: '2', teacherName: 'الشيخة أم الحسن' }
];

// Create a workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(students);

// Set column widths
ws['!cols'] = [
  { wch: 20 },
  { wch: 15 },
  { wch: 20 },
  { wch: 18 },
  { wch: 15 },
  { wch: 12 },
  { wch: 15 }
];

XLSX.utils.book_append_sheet(wb, ws, 'Students');

// Save to file
const filepath = path.join(__dirname, 'sample-students.xlsx');
XLSX.writeFile(wb, filepath);
console.log(`✓ Created sample Excel file: ${filepath}`);
