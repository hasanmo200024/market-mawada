/* ماركت المودة – إدارة البضائع | تصميم المودة للبرمجيات */

// ============================================================
// الحالة العامة (State)
// ============================================================
var S = { user: null, items: [], cust: [], supp: [], sales: [], buys: [], pay: [], tx: [], ns: 0, nb: 0 };
var tab = 'sell';
var pre = '';
var ed = null;
var rf = '';
var rt = '';
var auth = false;
var cart = [];
var bcart = [];
var sel = null;
var dp = null;
var iq = '';
var LOGO = 'assets/logo.jpg';

// ============================================================
// التخزين المحلي
// ============================================================
function save() {
  try {
    localStorage.setItem('mawadda2', JSON.stringify(S));
  } catch (e) {}
}

(function () {
  try {
    var raw = localStorage.getItem('mawadda2');
    if (raw) S = Object.assign(S, JSON.parse(raw));
  } catch (e) {}
})();
S.set = Object.assign({ days: 30, lead: 3, notif: false, last: '' }, S.set || {});

// ============================================================
// دوال مساعدة عامة
// ============================================================
function $(i) {
  return document.getElementById(i);
}

function n(i) {
  return parseFloat($(i).value) || 0;
}

function f(x) {
  return (Math.round(x * 100) / 100).toLocaleString('ar-EG');
}

function E(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

function dt(t) {
  return new Date(t).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
}

function fld(id, l, t) {
  return '<label>' + l + '</label><input id="' + id + '" type="' + (t || 'text') + '">';
}

// ============================================================
// حسابات وبيانات مشتركة
// ============================================================
function item(nm) {
  return S.items.filter(function (i) {
    return i.name == nm;
  })[0];
}

function pname(k, id) {
  var L = k == 'c' ? S.cust : S.supp,
    p = L.filter(function (x) {
      return x.id == id;
    })[0];
  return p ? p.name : k == 'c' ? 'عميل نقدي' : '—';
}

function P(k, id) {
  return (
    (k == 'c' ? S.cust : S.supp).filter(function (x) {
      return x.id == id;
    })[0] || {}
  );
}

function st(k, id) {
  var docs =
      k == 'c'
        ? S.sales.filter(function (s) {
            return s.cid == id;
          })
        : S.buys.filter(function (b) {
            return b.sid == id;
          }),
    pays = S.pay.filter(function (p) {
      return p.k == k && p.pid == id;
    }),
    tot = docs.reduce(function (s, x) {
      return s + x.total;
    }, 0),
    paid =
      docs.reduce(function (s, x) {
        return s + x.paid;
      }, 0) +
      pays.reduce(function (s, x) {
        return s + x.amt;
      }, 0);
  return { docs: docs, pays: pays, tot: tot, paid: paid, bal: tot - paid };
}

function bal() {
  return S.tx.reduce(function (s, t) {
    return s + (t.type == 'in' ? t.amt : -t.amt);
  }, 0);
}

function addTx(type, amt, note) {
  S.tx.unshift({ ts: Date.now(), type: type, amt: amt, note: note });
}

function dueList() {
  var now = Date.now();
  return S.cust
    .map(function (c) {
      var s = st('c', c.id),
        m = Infinity;
      s.docs.forEach(function (d) {
        if (d.total - d.paid > 0) {
          var x = d.due || d.ts + S.set.days * 864e5;
          if (x < m) m = x;
        }
      });
      return { c: c, bal: s.bal, due: m };
    })
    .filter(function (r) {
      return r.bal > 0 && r.due <= now + S.set.lead * 864e5;
    })
    .sort(function (a, b) {
      return a.due - b.due;
    });
}

function dueTxt(r) {
  var d = Math.round((r.due - Date.now()) / 864e5);
  return d < 0 ? 'متأخر ' + -d + ' يوم' : d == 0 ? 'مستحق اليوم' : 'يستحق بعد ' + d + ' يوم';
}

function ctn(i) {
  var u = i.up,
    c = Math.floor(i.stock / (u > 0 ? u : 1)),
    r = Math.round((i.stock - c * u) * 100) / 100;
  return u > 0
    ? (c ? f(c) + ' كرتونة' : '') + (r ? (c ? ' + ' : '') + f(r) + ' قطعة' : c ? '' : '0')
    : f(i.stock);
}

// ============================================================
// الواجهة الرئيسية وتسجيل الدخول
// ============================================================
function render() {
  var a = $('app');
  if (!auth) {
    if (!S.user) {
      a.innerHTML =
        '<div class="login"><div class="lbox"><img class="lg" src="' +
        LOGO +
        '"><h1>إنشاء حساب جديد</h1><div class="by">تصميم المودة للبرمجيات</div>' +
        fld('rn', 'الاسم') +
        fld('rp', 'رقم الهاتف', 'tel') +
        fld('rc', 'اسم الشركة / المحل') +
        fld('ra', 'العنوان') +
        fld('rw', 'كلمة المرور', 'password') +
        '<button onclick="reg()">إنشاء الحساب</button><div class="err" id="e"></div><button class="sec" style="width:100%;margin-top:8px" onclick="inst()">📲 تثبيت التطبيق</button></div></div>';
    } else {
      a.innerHTML =
        '<div class="login"><div class="lbox"><img class="lg" src="' +
        LOGO +
        '"><h1>' +
        E(S.user.company) +
        '</h1><div class="by">تصميم المودة للبرمجيات</div>' +
        fld('lp', 'رقم الهاتف', 'tel') +
        fld('lw', 'كلمة المرور', 'password') +
        '<button onclick="login()">تسجيل الدخول</button><div class="err" id="e"></div><button class="sec" style="width:100%;margin-top:8px" onclick="inst()">📲 تثبيت التطبيق</button></div></div>';
    }
    return;
  }
  var rn = dueList().length,
    low = S.items.filter(function (i) {
      return i.min > 0 && i.stock <= i.min;
    }).length,
    T = [
      ['sell', 'المبيعات'],
      ['buy', 'المشتريات'],
      ['cust', 'العملاء' + (rn ? ' 🔔' + rn : '')],
      ['supp', 'الموردين'],
      ['inv', 'الفواتير'],
      ['items', 'الأصناف'],
      ['stock', 'المخزن' + (low ? ' ⚠' + low : '')],
      ['cash', 'الخزينة'],
      ['rep', 'التقارير'],
      ['set', '⚙ الإعدادات'],
    ];
  a.innerHTML =
    '<header><div><img src="' +
    LOGO +
    '"><b>' +
    E(S.user.company) +
    '</b></div><span style="display:flex;gap:6px"><button onclick="themeNext()">🌓</button><button onclick="auth=false;render()">خروج</button></span></header><nav>' +
    T.map(function (t) {
      return (
        '<button class="' +
        (tab == t[0] ? 'on' : '') +
        '" onclick="tab=\'' +
        t[0] +
        '\';sel=null;render()">' +
        t[1] +
        '</button>'
      );
    }).join('') +
    '</nav><main id="m"></main>';
  if (tab == 'sell') sellV();
  else if (tab == 'buy') buyV();
  else if (tab == 'cust') partyV('c');
  else if (tab == 'supp') partyV('s');
  else if (tab == 'stock') stockV();
  else if (tab == 'items') itemsV();
  else if (tab == 'inv') invV();
  else if (tab == 'rep') repV();
  else if (tab == 'set') setV();
  else cashV();
}

function reg() {
  var u = {
    name: $('rn').value.trim(),
    phone: $('rp').value.trim(),
    company: $('rc').value.trim(),
    addr: $('ra').value.trim(),
    pw: $('rw').value,
  };
  if (!u.name || !u.phone || !u.company || !u.pw) {
    $('e').textContent = 'املأ الاسم والهاتف واسم الشركة وكلمة المرور';
    return;
  }
  S.user = u;
  save();
  auth = true;
  render();
}

function login() {
  if ($('lp').value.trim() !== S.user.phone || $('lw').value !== S.user.pw) {
    $('e').textContent = 'بيانات الدخول غير صحيحة';
    return;
  }
  auth = true;
  render();
}

// ============================================================
// المبيعات
// ============================================================
function sellV() {
  $('m').innerHTML =
    '<div class="card"><h3>فاتورة بيع' +
    (ed && ed.k == 's'
      ? ' (تعديل رقم ' +
        ed.id +
        ') <button class="sec" onclick="ed=null;cart=[];render()">إلغاء التعديل</button>'
      : '') +
    '</h3><label>العميل</label><select id="sc"><option value="">عميل نقدي</option>' +
    S.cust
      .map(function (c) {
        return '<option value="' + c.id + '">' + E(c.name) + '</option>';
      })
      .join('') +
    '</select>' +
    '<div class="g"><div><label>الصنف</label><select id="si" onchange="sp()"><option value="">— اختر —</option>' +
    S.items
      .map(function (i) {
        return '<option value="' + E(i.name) + '">' + E(i.name) + ' (متاح ' + f(i.stock) + ')</option>';
      })
      .join('') +
    '</select></div>' +
    '<div><label>نوع البيع</label><select id="st" onchange="sp()"><option value="pr">قطاعي</option><option value="pw">جملة</option><option value="ps">جملة الجملة</option></select></div>' +
    '<div><label>الكمية</label><input id="sq" type="number" step="any"></div><div><label>سعر الوحدة</label><input id="sx" type="number" step="any"></div></div>' +
    '<button onclick="addS()">+ إضافة للفاتورة</button><div class="err" id="e"></div><div id="cl"></div></div>';
  if (pre !== '') {
    $('sc').value = pre;
    pre = '';
  }
  rc();
}

function sp() {
  var i = item($('si').value);
  if (i) $('sx').value = i[$('st').value] || 0;
}

function addS() {
  var i = item($('si').value),
    q = n('sq'),
    x = n('sx'),
    tn = { pr: 'قطاعي', pw: 'جملة', ps: 'جملة الجملة' }[$('st').value];
  if (!i || q <= 0 || x <= 0) {
    $('e').textContent = 'اختر الصنف واكتب الكمية والسعر';
    return;
  }
  var used = cart
    .filter(function (l) {
      return l.name == i.name;
    })
    .reduce(function (s, l) {
      return s + l.q;
    }, 0);
  if (q + used > i.stock) {
    $('e').textContent = 'الكمية أكبر من المتاح';
    return;
  }
  $('e').textContent = '';
  cart.push({ name: i.name, type: tn, q: q, x: x, t: q * x, c: i.cost });
  rc();
}

function rc() {
  var t = cart.reduce(function (s, l) {
    return s + l.t;
  }, 0);
  $('cl').innerHTML = cart.length
    ? '<div class="sc"><table><tr><th>الصنف</th><th>النوع</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th><th></th></tr>' +
      cart
        .map(function (l, k) {
          return (
            '<tr><td>' +
            E(l.name) +
            '</td><td>' +
            l.type +
            '</td><td>' +
            f(l.q) +
            '</td><td>' +
            f(l.x) +
            '</td><td>' +
            f(l.t) +
            '</td><td><button class="sec" onclick="cart.splice(' +
            k +
            ',1);rc()">✕</button></td></tr>'
          );
        })
        .join('') +
      '</table></div><div class="calc"><span>إجمالي الفاتورة: <b>' +
      f(t) +
      '</b></span></div><label>المبلغ المدفوع الآن (اتركه فارغاً = مدفوع بالكامل)</label><input id="pd" type="number" step="any"><label>تاريخ استحقاق الباقي (اختياري)</label><input id="dd" type="date"><button onclick="saveS()">حفظ الفاتورة</button>'
    : '';
}

function saveS() {
  var t = cart.reduce(function (s, l) {
      return s + l.t;
    }, 0),
    pv = $('pd').value,
    paid = pv === '' ? t : Math.min(parseFloat(pv) || 0, t),
    cid = $('sc').value;
  if (cid === '' && paid < t) paid = t;
  var o = ed && ed.k == 's' ? revert('s', ed.id) : null;
  ed = null;
  cart.forEach(function (l) {
    item(l.name).stock -= l.q;
  });
  var inv = {
    id: o ? o.id : ++S.ns,
    ts: o ? o.ts : Date.now(),
    cid: cid,
    lines: cart,
    total: t,
    paid: paid,
    due: $('dd') && $('dd').value ? new Date($('dd').value).getTime() : 0,
  };
  S.sales.unshift(inv);
  if (paid > 0) addTx('in', paid, 'فاتورة بيع #' + inv.id);
  cart = [];
  save();
  showInv('s', inv.id);
}

// ============================================================
// المشتريات
// ============================================================
function buyV() {
  $('m').innerHTML =
    '<div class="card"><h3>فاتورة شراء' +
    (ed && ed.k == 'b'
      ? ' (تعديل رقم ' +
        ed.id +
        ') <button class="sec" onclick="ed=null;bcart=[];render()">إلغاء التعديل</button>'
      : '') +
    '</h3><label>المورد</label><select id="bs"><option value="">— اختر المورد —</option>' +
    S.supp
      .map(function (c) {
        return '<option value="' + c.id + '">' + E(c.name) + '</option>';
      })
      .join('') +
    '</select>' +
    '<label>اسم الصنف</label><input id="nm" list="dl" oninput="fill()"><datalist id="dl">' +
    S.items
      .map(function (i) {
        return '<option value="' + E(i.name) + '">';
      })
      .join('') +
    '</datalist>' +
    '<div class="g"><div><label>عدد القطع/الكيلو في الكرتونة</label><input id="up" type="number" step="any" oninput="bcalc()"></div>' +
    '<div><label>عدد الكراتين</label><input id="q" type="number" step="any" oninput="bcalc()"></div>' +
    '<div><label>سعر شراء الكرتونة</label><input id="cp" type="number" step="any" oninput="bcalc()"></div></div>' +
    '<div class="calc"><span>سعر القطعة/الكيلو: <b id="r1">0</b></span><span>إجمالي القطع: <b id="r2">0</b></span><span>إجمالي السطر: <b id="r3">0</b></span></div>' +
    '<div class="g"><div><label>سعر القطاعي</label><input id="pr" type="number" step="any"></div><div><label>سعر الجملة</label><input id="pw" type="number" step="any"></div><div><label>سعر جملة الجملة</label><input id="ps" type="number" step="any"></div></div>' +
    '<button onclick="addB()">+ إضافة للفاتورة</button><div class="err" id="e"></div><div id="cl"></div></div>';
  if (pre !== '') {
    $('bs').value = pre;
    pre = '';
  }
  rb();
}

function bcalc() {
  var u = n('up'),
    q = n('q'),
    c = n('cp');
  $('r1').textContent = u ? f(c / u) : 0;
  $('r2').textContent = f(u * q);
  $('r3').textContent = f(q * c);
}

function fill() {
  var i = item($('nm').value);
  if (i) {
    $('up').value = i.up;
    $('pr').value = i.pr;
    $('pw').value = i.pw;
    $('ps').value = i.ps;
    bcalc();
  }
}

function addB() {
  var nm = $('nm').value.trim(),
    u = n('up'),
    q = n('q'),
    c = n('cp');
  if (!nm || u <= 0 || q <= 0 || c <= 0) {
    $('e').textContent = 'كمّل الاسم وعدد القطع والكمية وسعر الكرتونة';
    return;
  }
  $('e').textContent = '';
  bcart.push({ name: nm, up: u, q: q, cp: c, x: c / u, t: q * c, pr: n('pr'), pw: n('pw'), ps: n('ps') });
  rb();
}

function rb() {
  var t = bcart.reduce(function (s, l) {
    return s + l.t;
  }, 0);
  $('cl').innerHTML = bcart.length
    ? '<div class="sc"><table><tr><th>الصنف</th><th>الكراتين</th><th>سعر الكرتونة</th><th>سعر القطعة</th><th>الإجمالي</th><th></th></tr>' +
      bcart
        .map(function (l, k) {
          return (
            '<tr><td>' +
            E(l.name) +
            '</td><td>' +
            f(l.q) +
            '</td><td>' +
            f(l.cp) +
            '</td><td>' +
            f(l.x) +
            '</td><td>' +
            f(l.t) +
            '</td><td><button class="sec" onclick="bcart.splice(' +
            k +
            ',1);rb()">✕</button></td></tr>'
          );
        })
        .join('') +
      '</table></div><div class="calc"><span>إجمالي الفاتورة: <b>' +
      f(t) +
      '</b></span></div><label>المبلغ المدفوع للمورد (فارغ = مدفوع بالكامل)</label><input id="pd" type="number" step="any"><button onclick="saveB()">حفظ الفاتورة</button>'
    : '';
}

function saveB() {
  var sid = $('bs').value;
  if (!sid) {
    $('e').textContent = 'اختر المورد (أضفه من قسم الموردين)';
    return;
  }
  var t = bcart.reduce(function (s, l) {
      return s + l.t;
    }, 0),
    pv = $('pd').value,
    paid = pv === '' ? t : Math.min(parseFloat(pv) || 0, t);
  var o = ed && ed.k == 'b' ? revert('b', ed.id) : null;
  ed = null;
  bcart.forEach(function (l) {
    var i = item(l.name);
    if (!i) {
      i = { name: l.name, stock: 0 };
      S.items.push(i);
    }
    i.up = l.up;
    i.cost = l.x;
    i.pr = l.pr;
    i.pw = l.pw;
    i.ps = l.ps;
    i.stock += l.up * l.q;
  });
  var inv = {
    id: o ? o.id : ++S.nb,
    ts: o ? o.ts : Date.now(),
    sid: sid,
    lines: bcart,
    total: t,
    paid: paid,
  };
  S.buys.unshift(inv);
  if (paid > 0) addTx('out', paid, 'فاتورة شراء #' + inv.id);
  bcart = [];
  save();
  showInv('b', inv.id);
}

// ============================================================
// العملاء والموردين وتذكير السداد
// ============================================================
function partyV(k) {
  var L = k == 'c' ? S.cust : S.supp,
    w = k == 'c' ? 'العميل' : 'المورد';
  if (sel) {
    stV(k);
    return;
  }
  $('m').innerHTML =
    (k == 'c' ? remCard() : '') +
    '<div class="card"><h3>إضافة ' +
    w +
    '</h3><div class="g"><div>' +
    fld('pn', 'الاسم') +
    '</div><div>' +
    fld('pp', 'رقم الهاتف', 'tel') +
    '</div></div><button onclick="addP(\'' +
    k +
    '\')">حفظ</button><div class="err" id="e"></div></div>' +
    '<div class="card"><h3>' +
    (k == 'c' ? 'العملاء' : 'الموردين') +
    '</h3><div class="sc"><table><tr><th>الاسم</th><th>الهاتف</th><th>إجمالي الفواتير</th><th>المسدد</th><th>' +
    (k == 'c' ? 'المتبقي عليه' : 'المتبقي له') +
    '</th><th></th></tr>' +
    L.map(function (p) {
      var s = st(k, p.id);
      return (
        '<tr><td>' +
        E(p.name) +
        '</td><td>' +
        E(p.phone) +
        '</td><td>' +
        f(s.tot) +
        '</td><td>' +
        f(s.paid) +
        '</td><td class="' +
        (s.bal > 0 ? 'out' : 'in') +
        '">' +
        f(s.bal) +
        '</td><td><button class="sec" onclick="sel=' +
        p.id +
        ';render()">كشف حساب</button></td></tr>'
      );
    }).join('') +
    '</table></div></div>';
}

function addP(k) {
  var nm = $('pn').value.trim();
  if (!nm) {
    $('e').textContent = 'اكتب الاسم';
    return;
  }
  (k == 'c' ? S.cust : S.supp).push({ id: Date.now(), name: nm, phone: $('pp').value.trim() });
  save();
  partyV(k);
}

function stV(k) {
  var s = st(k, sel),
    rows = [];
  s.docs.forEach(function (d) {
    rows.push({
      ts: d.ts,
      t: 'فاتورة ' + (k == 'c' ? 'بيع' : 'شراء') + ' #' + d.id,
      dr: d.total,
      cr: d.paid,
      id: d.id,
    });
  });
  s.pays.forEach(function (p) {
    rows.push({ ts: p.ts, t: 'سداد' + (p.note ? ' – ' + E(p.note) : ''), dr: 0, cr: p.amt });
  });
  rows.sort(function (a, b) {
    return b.ts - a.ts;
  });
  $('m').innerHTML =
    '<div class="card"><button class="sec" onclick="sel=null;render()">← رجوع</button><h3>' +
    E(pname(k, sel)) +
    '</h3>' +
    '<div class="g"><div><label>الاسم</label><input id="en" value="' +
    E(pname(k, sel)) +
    '"></div><div><label>الهاتف</label><input id="ep" value="' +
    E(P(k, sel).phone) +
    '"></div></div><button class="sec" onclick="editP(\'' +
    k +
    '\')">حفظ التعديل</button> ' +
    (s.docs.length || s.pays.length ? '' : '<button class="sec" onclick="delP(\'' + k + '\')">حذف</button>') +
    '<div class="calc"><span>إجمالي الفواتير: <b>' +
    f(s.tot) +
    '</b></span><span>المسدد: <b>' +
    f(s.paid) +
    '</b></span><span>الرصيد المتبقي: <b class="' +
    (s.bal > 0 ? 'out' : 'in') +
    '">' +
    f(s.bal) +
    '</b></span></div>' +
    '<div class="g"><div>' +
    fld('pa', 'مبلغ السداد', 'number') +
    '</div><div>' +
    fld('pt', 'ملاحظة') +
    '</div></div><button onclick="payP(\'' +
    k +
    '\')">تسجيل سداد</button></div>' +
    '<div class="card"><h3>كشف الحساب</h3><div class="sc"><table><tr><th>التاريخ والوقت</th><th>البيان</th><th>قيمة الفاتورة</th><th>مسدد</th><th></th></tr>' +
    rows
      .map(function (r) {
        return (
          '<tr><td>' +
          dt(r.ts) +
          '</td><td>' +
          r.t +
          '</td><td>' +
          (r.dr ? f(r.dr) : '') +
          '</td><td>' +
          f(r.cr) +
          '</td><td>' +
          (r.id
            ? '<button class="sec" onclick="showInv(\'' +
              (k == 'c' ? 's' : 'b') +
              "'," +
              r.id +
              ')">عرض</button>'
            : '') +
          '</td></tr>'
        );
      })
      .join('') +
    '</table></div></div>';
}

function editP(k) {
  var p = P(k, sel);
  p.name = $('en').value.trim() || p.name;
  p.phone = $('ep').value.trim();
  save();
  stV(k);
}

function delP(k) {
  if (!confirm('حذف؟')) return;
  var L = k == 'c' ? S.cust : S.supp;
  L.splice(L.indexOf(P(k, sel)), 1);
  sel = null;
  save();
  render();
}

function payP(k) {
  var a = n('pa');
  if (a <= 0) return;
  S.pay.unshift({ ts: Date.now(), k: k, pid: sel, amt: a, note: $('pt').value });
  addTx(k == 'c' ? 'in' : 'out', a, 'سداد ' + (k == 'c' ? 'من ' : 'إلى ') + pname(k, sel));
  save();
  stV(k);
}

function remCard() {
  var L = dueList();
  if (!L.length) return '';
  return (
    '<div class="card"><h3>🔔 تذكير السداد (' +
    L.length +
    ')</h3><div class="sc"><table><tr><th>العميل</th><th>المتبقي</th><th>الاستحقاق</th><th></th></tr>' +
    L.map(function (r) {
      return (
        '<tr><td>' +
        E(r.c.name) +
        '</td><td class="out">' +
        f(r.bal) +
        '</td><td>' +
        dueTxt(r) +
        '</td><td><button class="sec" onclick="waRem(' +
        r.c.id +
        ')">💬 تذكير واتساب</button></td></tr>'
      );
    }).join('') +
    '</table></div></div>'
  );
}

function waRem(id) {
  var r = dueList().filter(function (x) {
    return x.c.id == id;
  })[0];
  if (r)
    wa(
      r.c.phone,
      'السلام عليكم ' +
        r.c.name +
        '،\nتذكير من ' +
        S.user.company +
        ': المتبقي على حسابكم ' +
        f(r.bal) +
        ' ج.م (' +
        dueTxt(r) +
        ').\nبرجاء السداد في أقرب وقت. شكراً لتعاملكم معنا 🌿',
    );
}

// ============================================================
// الفواتير (عرض / طباعة / تعديل / حذف)
// ============================================================
function invV() {
  var all = S.sales
    .map(function (d) {
      return { k: 's', d: d, p: pname('c', d.cid) };
    })
    .concat(
      S.buys.map(function (d) {
        return { k: 'b', d: d, p: pname('s', d.sid) };
      }),
    )
    .sort(function (a, b) {
      return b.d.ts - a.d.ts;
    });
  $('m').innerHTML =
    '<div class="card"><h3>سجل الفواتير</h3><div class="sc"><table><tr><th>التاريخ والوقت</th><th>النوع</th><th>رقم</th><th>الطرف</th><th>الإجمالي</th><th>المتبقي</th><th></th></tr>' +
    all
      .map(function (r) {
        var d = r.d;
        return (
          '<tr><td>' +
          dt(d.ts) +
          '</td><td>' +
          (r.k == 's' ? 'بيع' : 'شراء') +
          '</td><td>' +
          d.id +
          '</td><td>' +
          E(r.p) +
          '</td><td>' +
          f(d.total) +
          '</td><td>' +
          f(d.total - d.paid) +
          '</td><td><button class="sec" onclick="showInv(\'' +
          r.k +
          "'," +
          d.id +
          ')">عرض</button></td></tr>'
        );
      })
      .join('') +
    '</table></div></div>';
}

function showInv(k, id) {
  var d = (k == 's' ? S.sales : S.buys).filter(function (x) {
      return x.id == id;
    })[0],
    u = S.user,
    sale = k == 's',
    pn = sale ? pname('c', d.cid) : pname('s', d.sid),
    rem = d.total - d.paid;
  $('inv').style.display = 'block';
  $('inv').innerHTML =
    '<div class="paper"><div class="ph"><img class="lg" src="' +
    LOGO +
    '"><div><h2>' +
    E(u.company) +
    '</h2><div>' +
    E(u.addr) +
    '</div><div>هاتف: ' +
    E(u.phone) +
    '</div></div></div>' +
    '<h3 style="margin:4px 0">فاتورة ' +
    (sale ? 'بيع' : 'شراء') +
    ' رقم ' +
    d.id +
    '</h3><div>التاريخ والوقت: ' +
    dt(d.ts) +
    '</div><div>' +
    (sale ? 'العميل: ' : 'المورد: ') +
    E(pn) +
    '</div>' +
    '<div class="sc"><table><tr><th>الصنف</th><th>الكمية</th><th>' +
    (sale ? 'السعر' : 'سعر الكرتونة') +
    '</th><th>الإجمالي</th></tr>' +
    d.lines
      .map(function (l) {
        return (
          '<tr><td>' +
          E(l.name) +
          (sale ? ' (' + l.type + ')' : '') +
          '</td><td>' +
          f(l.q) +
          (sale ? '' : ' كرتونة') +
          '</td><td>' +
          f(sale ? l.x : l.cp) +
          '</td><td>' +
          f(l.t) +
          '</td></tr>'
        );
      })
      .join('') +
    '</table></div>' +
    '<h3>الإجمالي: ' +
    f(d.total) +
    ' ج.م</h3><div>المدفوع: ' +
    f(d.paid) +
    ' ج.م</div><div>المتبقي: <b>' +
    f(rem) +
    ' ج.م</b></div>' +
    '<div class="ft">شكراً لتعاملكم معنا – تصميم المودة للبرمجيات</div>' +
    '<div class="noprint"><button onclick="window.print()">🖨 طباعة / حفظ PDF</button><button style="background:#cfe8c0" onclick="editInv(\'' +
    k +
    "'," +
    id +
    ')">✏️ تعديل</button><button style="background:#f4c7c3" onclick="delInv(\'' +
    k +
    "'," +
    id +
    ')">🗑 حذف</button><button style="background:#b9efc9" onclick="waInv(\'' +
    k +
    "'," +
    id +
    ')">💬 واتساب</button><button style="background:#ddd" onclick="closeInv()">إغلاق</button><div class="by">لحفظ PDF اختر «حفظ كـ PDF» من نافذة الطباعة</div></div></div>';
}

function closeInv() {
  $('inv').style.display = 'none';
  render();
}

function revert(k, id) {
  var A = k == 's' ? S.sales : S.buys,
    d = A.filter(function (x) {
      return x.id == id;
    })[0];
  d.lines.forEach(function (l) {
    var i = item(l.name);
    if (i) {
      i.stock += k == 's' ? l.q : -l.up * l.q;
      if (i.stock < 0) i.stock = 0;
    }
  });
  S.tx = S.tx.filter(function (t) {
    return t.note != (k == 's' ? 'فاتورة بيع #' : 'فاتورة شراء #') + id;
  });
  A.splice(A.indexOf(d), 1);
  return d;
}

function delInv(k, id) {
  if (!confirm('حذف الفاتورة وإرجاع المخزون والخزينة؟')) return;
  revert(k, id);
  save();
  closeInv();
}

function editInv(k, id) {
  var d = (k == 's' ? S.sales : S.buys).filter(function (x) {
      return x.id == id;
    })[0],
    c = JSON.parse(JSON.stringify(d.lines));
  ed = { k: k, id: id };
  if (k == 's') {
    cart = c;
    pre = d.cid;
    tab = 'sell';
  } else {
    bcart = c;
    pre = d.sid;
    tab = 'buy';
  }
  sel = null;
  closeInv();
}

function waInv(k, id) {
  var d = (k == 's' ? S.sales : S.buys).filter(function (x) {
      return x.id == id;
    })[0],
    sale = k == 's',
    p = P(sale ? 'c' : 's', sale ? d.cid : d.sid);
  if (!p.phone) {
    alert('لا يوجد رقم هاتف مسجل لهذا ' + (sale ? 'العميل' : 'المورد'));
    return;
  }
  wa(
    p.phone,
    (sale ? 'فاتورة بيع' : 'فاتورة شراء') +
      ' رقم ' +
      d.id +
      ' – ' +
      S.user.company +
      '\n' +
      dt(d.ts) +
      '\n\n' +
      d.lines
        .map(function (l) {
          return '• ' + l.name + ' × ' + f(l.q) + (sale ? '' : ' كرتونة') + ' = ' + f(l.t);
        })
        .join('\n') +
      '\n\nالإجمالي: ' +
      f(d.total) +
      ' ج.م\nالمدفوع: ' +
      f(d.paid) +
      ' ج.م\nالمتبقي: ' +
      f(d.total - d.paid) +
      ' ج.م\n\nشكراً لتعاملكم معنا 🌿',
  );
}

// ============================================================
// الأصناف والمخزن
// ============================================================
function itemsV() {
  $('m').innerHTML =
    '<div class="card"><h3>إضافة صنف</h3><div class="g"><div>' +
    fld('an', 'اسم الصنف') +
    '</div><div>' +
    fld('au', 'عدد القطع/الكيلو في الكرتونة', 'number') +
    '</div><div>' +
    fld('ac', 'سعر شراء الكرتونة', 'number') +
    '</div><div>' +
    fld('as', 'الكمية الحالية (قطع/كيلو)', 'number') +
    '</div><div>' +
    fld('ar', 'سعر القطاعي', 'number') +
    '</div><div>' +
    fld('aw', 'سعر الجملة', 'number') +
    '</div><div>' +
    fld('ag', 'سعر جملة الجملة', 'number') +
    '</div><div>' +
    fld('am', 'حد التنبيه', 'number') +
    '</div></div><button onclick="addIt()">حفظ الصنف</button><div class="err" id="e"></div></div>' +
    '<div class="card"><h3>كل الأصناف</h3><input id="iq" placeholder="🔍 بحث باسم الصنف" value="' +
    E(iq) +
    '" oninput="iq=this.value;itT()"><div class="calc" id="tt"></div><div id="it"></div></div>';
  itT();
}

function addIt() {
  var nm = $('an').value.trim(),
    u = n('au');
  if (!nm) {
    $('e').textContent = 'اكتب اسم الصنف';
    return;
  }
  if (item(nm)) {
    $('e').textContent = 'الصنف موجود بالفعل';
    return;
  }
  S.items.push({
    name: nm,
    up: u,
    cost: u > 0 ? n('ac') / u : n('ac'),
    stock: n('as'),
    pr: n('ar'),
    pw: n('aw'),
    ps: n('ag'),
    min: n('am'),
  });
  save();
  itemsV();
}

function itT() {
  var L = S.items.filter(function (i) {
    return i.name.indexOf(iq.trim()) >= 0;
  });
  $('it').innerHTML =
    '<div class="sc"><table><tr><th>الصنف</th><th>في الكرتونة</th><th>المتاح (قطع)</th><th>بالكراتين</th><th>سعر شراء القطعة</th><th>قطاعي</th><th>جملة</th><th>جملة الجملة</th><th>قيمة المخزون</th><th></th></tr>' +
    L.map(function (i) {
      var k = S.items.indexOf(i),
        inp = function (p, w) {
          return (
            '<td><input type="number" step="any" style="width:' +
            (w || 76) +
            'px;padding:4px" value="' +
            Math.round((i[p] || 0) * 100) / 100 +
            '" onchange="itSet(' +
            k +
            ",'" +
            p +
            '\',this.value)"></td>'
          );
        };
      return (
        '<tr><td><input style="width:130px;padding:4px" value="' +
        E(i.name) +
        '" onchange="itRen(' +
        k +
        ',this.value)"></td>' +
        inp('up', 64) +
        inp('stock') +
        '<td id="c' +
        k +
        '"></td>' +
        inp('cost') +
        inp('pr') +
        inp('pw') +
        inp('ps') +
        '<td id="v' +
        k +
        '"></td><td><button class="sec" onclick="itDel(' +
        k +
        ')">حذف</button></td></tr>'
      );
    }).join('') +
    '</table></div>';
  itCalc();
}

function itCalc() {
  var tp = 0,
    tc = 0,
    tr = 0,
    c = 0;
  S.items.forEach(function (i, k) {
    var e = $('c' + k);
    if (!e) return;
    c++;
    tp += i.stock;
    tc += i.stock * i.cost;
    tr += i.stock * (i.pr || 0);
    e.textContent = ctn(i);
    $('v' + k).textContent = f(i.stock * i.cost);
  });
  $('tt').innerHTML =
    '<span>عدد الأصناف: <b>' +
    c +
    '</b></span><span>إجمالي الكميات: <b>' +
    f(tp) +
    '</b></span><span>قيمة المخزون بسعر الشراء: <b>' +
    f(tc) +
    '</b></span><span>قيمته بسعر القطاعي: <b>' +
    f(tr) +
    '</b></span>';
}

function itSet(k, p, v) {
  S.items[k][p] = parseFloat(v) || 0;
  save();
  itCalc();
}

function itRen(k, v) {
  v = v.trim();
  var o = S.items[k].name;
  if (!v || (v != o && item(v))) {
    alert('الاسم فارغ أو مكرر');
    itT();
    return;
  }
  S.sales.concat(S.buys).forEach(function (d) {
    d.lines.forEach(function (l) {
      if (l.name == o) l.name = v;
    });
  });
  cart.concat(bcart).forEach(function (l) {
    if (l.name == o) l.name = v;
  });
  S.items[k].name = v;
  save();
}

function itDel(k) {
  if (confirm('حذف الصنف؟')) {
    S.items.splice(k, 1);
    save();
    itemsV();
  }
}

function stockV() {
  var v = S.items.reduce(function (s, i) {
      return s + i.stock * i.cost;
    }, 0),
    lw = S.items.filter(function (i) {
      return i.min > 0 && i.stock <= i.min;
    });
  $('m').innerHTML =
    (lw.length
      ? '<div class="card out"><b>⚠ تنبيه نقص مخزون:</b> ' +
        lw
          .map(function (i) {
            return E(i.name) + ' (' + f(i.stock) + ')';
          })
          .join('، ') +
        '</div>'
      : '') +
    '<div class="card"><h3>المخزن</h3><div>قيمة المخزون بسعر الشراء: <b>' +
    f(v) +
    '</b></div><div class="sc"><table><tr><th>الصنف</th><th>المتاح</th><th>سعر الشراء</th><th>قطاعي</th><th>جملة</th><th>جملة الجملة</th><th>حد التنبيه</th><th></th></tr>' +
    S.items
      .map(function (i, k) {
        return (
          '<tr><td>' +
          E(i.name) +
          '</td><td class="' +
          (i.min > 0 && i.stock <= i.min ? 'out' : '') +
          '">' +
          f(i.stock) +
          '</td><td>' +
          f(i.cost) +
          '</td>' +
          ['pr', 'pw', 'ps', 'min']
            .map(function (p) {
              return (
                '<td><input type="number" step="any" style="width:80px;padding:4px" value="' +
                (i[p] || 0) +
                '" onchange="S.items[' +
                k +
                '].' +
                p +
                '=parseFloat(this.value)||0;save()"></td>'
              );
            })
            .join('') +
          '<td><button class="sec" onclick="delIt(' +
          k +
          ')">حذف</button></td></tr>'
        );
      })
      .join('') +
    '</table></div></div>';
}

function delIt(k) {
  if (confirm('حذف الصنف؟')) {
    S.items.splice(k, 1);
    save();
    stockV();
  }
}

// ============================================================
// الخزينة
// ============================================================
function cashV() {
  var b = bal();
  $('m').innerHTML =
    '<div class="card"><h3>رصيد الخزينة</h3><div class="big ' +
    (b >= 0 ? 'in' : 'out') +
    '">' +
    f(b) +
    ' ج.م</div></div>' +
    '<div class="card"><h3>حركة يدوية</h3><div class="g"><div><label>النوع</label><select id="ct"><option value="in">إيداع</option><option value="out">سحب / مصروف</option></select></div><div>' +
    fld('ca', 'المبلغ', 'number') +
    '</div><div>' +
    fld('cn', 'البيان') +
    '</div></div><button onclick="manual()">حفظ</button></div>' +
    '<div class="card"><h3>سجل الحركات</h3><div class="sc"><table><tr><th>التاريخ والوقت</th><th>البيان</th><th>وارد</th><th>صادر</th></tr>' +
    S.tx
      .slice(0, 80)
      .map(function (t) {
        return (
          '<tr><td>' +
          dt(t.ts) +
          '</td><td>' +
          E(t.note) +
          '</td><td class="in">' +
          (t.type == 'in' ? f(t.amt) : '') +
          '</td><td class="out">' +
          (t.type == 'out' ? f(t.amt) : '') +
          '</td></tr>'
        );
      })
      .join('') +
    '</table></div></div>';
}

function manual() {
  var a = n('ca');
  if (a <= 0) return;
  addTx($('ct').value, a, $('cn').value || 'حركة يدوية');
  save();
  cashV();
}

// ============================================================
// التقارير
// ============================================================
function repV() {
  var a = rf ? new Date(rf).getTime() : 0,
    b = rt ? new Date(rt).getTime() + 864e5 : Infinity,
    sales = 0,
    cost = 0,
    per = {};
  function inr(x) {
    return x.ts >= a && x.ts < b;
  }
  var ss = S.sales.filter(inr),
    bb = S.buys.filter(inr),
    tx = S.tx.filter(inr);
  ss.forEach(function (s) {
    sales += s.total;
    s.lines.forEach(function (l) {
      var c = l.c != null ? l.c : (item(l.name) || { cost: 0 }).cost;
      cost += l.q * c;
      per[l.name] = per[l.name] || { q: 0, p: 0 };
      per[l.name].q += l.q;
      per[l.name].p += l.q * (l.x - c);
    });
  });
  var buys = bb.reduce(function (s, x) {
      return s + x.total;
    }, 0),
    exp = tx
      .filter(function (t) {
        return t.type == 'out' && t.note.indexOf('فاتورة شراء') !== 0 && t.note.indexOf('سداد') !== 0;
      })
      .reduce(function (s, t) {
        return s + t.amt;
      }, 0),
    rec = S.cust.reduce(function (s, p) {
      return s + st('c', p.id).bal;
    }, 0),
    pay = S.supp.reduce(function (s, p) {
      return s + st('s', p.id).bal;
    }, 0),
    pf = sales - cost - exp;
  $('m').innerHTML =
    '<div class="card"><h3>التقارير</h3><div class="g"><div><label>من تاريخ</label><input type="date" value="' +
    rf +
    '" onchange="rf=this.value;repV()"></div><div><label>إلى تاريخ</label><input type="date" value="' +
    rt +
    '" onchange="rt=this.value;repV()"></div></div>' +
    '<div class="calc"><span>المبيعات: <b>' +
    f(sales) +
    '</b></span><span>تكلفة البضاعة المباعة: <b>' +
    f(cost) +
    '</b></span><span>مصروفات: <b>' +
    f(exp) +
    '</b></span><span>المشتريات: <b>' +
    f(buys) +
    '</b></span></div>' +
    '<div class="calc"><span>صافي الربح: <b class="' +
    (pf >= 0 ? 'in' : 'out') +
    '">' +
    f(pf) +
    '</b></span><span>مستحق لدى العملاء: <b>' +
    f(rec) +
    '</b></span><span>مستحق للموردين: <b>' +
    f(pay) +
    '</b></span><span>رصيد الخزينة: <b>' +
    f(bal()) +
    '</b></span></div></div>' +
    '<div class="card"><h3>الأصناف الأعلى ربحاً</h3><div class="sc"><table><tr><th>الصنف</th><th>الكمية المباعة</th><th>الربح</th></tr>' +
    Object.keys(per)
      .sort(function (x, y) {
        return per[y].p - per[x].p;
      })
      .map(function (k) {
        return '<tr><td>' + E(k) + '</td><td>' + f(per[k].q) + '</td><td>' + f(per[k].p) + '</td></tr>';
      })
      .join('') +
    '</table></div></div>';
}

// ============================================================
// الإعدادات والتصدير والنسخ الاحتياطي
// ============================================================
function setV() {
  var B = [
    ['items', 'المخزن'],
    ['sales', 'المبيعات'],
    ['buys', 'المشتريات'],
    ['cust', 'العملاء'],
    ['supp', 'الموردين'],
    ['cash', 'الخزينة'],
  ];
  $('m').innerHTML =
    setCards() +
    '<div class="card"><h3>تصدير إلى Excel (CSV)</h3><div class="g">' +
    B.map(function (b) {
      return '<button onclick="ex(\'' + b[0] + '\')">' + b[1] + '</button>';
    }).join('') +
    '</div></div>' +
    '<div class="card"><h3>نسخة احتياطية</h3><div>احفظ نسخة من كل بياناتك، أو انقلها لجهاز آخر.</div><button onclick="dl(\'mawadda-backup.json\',JSON.stringify(S))">حفظ نسخة احتياطية</button>' +
    '<label>استرجاع نسخة (ملف .json)</label><input type="file" accept=".json" onchange="restore(this)"><div class="err" id="e"></div></div>' +
    aboutCard();
}

function setCards() {
  var th = curTheme(),
    o = function (v, t) {
      return '<option value="' + v + '"' + (th == v ? ' selected' : '') + '>' + t + '</option>';
    },
    on = S.set.notif && 'Notification' in window && Notification.permission == 'granted';
  return (
    '<div class="card"><h3>🎨 المظهر</h3><select onchange="setTheme(this.value)">' +
    o('auto', 'تلقائي (حسب الجهاز)') +
    o('light', 'فاتح') +
    o('dark', 'داكن (دارك مود)') +
    '</select></div>' +
    '<div class="card"><h3>🔔 الإشعارات وتذكير السداد</h3><div class="by" style="text-align:right">تظهر الإشعارات عند فتح التطبيق (مرة يومياً) للتذكير بالمبالغ المستحقة والأصناف الناقصة.</div>' +
    (on
      ? '<button onclick="offNotif()">إيقاف الإشعارات</button>'
      : '<button onclick="enNotif()">تفعيل الإشعارات</button>') +
    '<div class="g"><div><label>التذكير قبل الاستحقاق بـ (أيام)</label><input type="number" value="' +
    S.set.lead +
    '" onchange="S.set.lead=parseInt(this.value)||0;save()"></div><div><label>استحقاق الفواتير بدون تاريخ بعد (أيام)</label><input type="number" value="' +
    S.set.days +
    '" onchange="S.set.days=parseInt(this.value)||30;save()"></div></div></div>'
  );
}

function aboutCard() {
  return '<div class="card"><h3>ℹ️ حول</h3><div>ماركت المودة – نظام إدارة البضائع</div><div class="by" style="text-align:right">تصميم المودة للبرمجيات • الإصدار 2.1</div><button onclick="inst()">📲 تثبيت التطبيق على الجهاز</button></div>';
}

function dl(name, data) {
  var fb = function () {
    var b = new Blob([data], { type: 'text/plain;charset=utf-8' }),
      a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  if (!window.claude) {
    fb();
    return;
  }
  claude.use('downloads').then(function (d) {
    if (!d) {
      fb();
      return;
    }
    d.save({ filename: name, data: data }).catch(function () {});
  });
}

function csv(R) {
  return (
    '\ufeff' +
    R.map(function (r) {
      return r
        .map(function (c) {
          return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"';
        })
        .join(',');
    }).join('\n')
  );
}

function ex(w) {
  var R;
  if (w == 'items')
    R = [['الصنف', 'المتاح', 'سعر الشراء', 'قطاعي', 'جملة', 'جملة الجملة']].concat(
      S.items.map(function (i) {
        return [i.name, i.stock, i.cost, i.pr, i.pw, i.ps];
      }),
    );
  else if (w == 'sales') {
    R = [['التاريخ', 'رقم', 'العميل', 'الصنف', 'النوع', 'الكمية', 'السعر', 'الإجمالي']];
    S.sales.forEach(function (d) {
      d.lines.forEach(function (l) {
        R.push([dt(d.ts), d.id, pname('c', d.cid), l.name, l.type, l.q, l.x, l.t]);
      });
    });
  } else if (w == 'buys') {
    R = [['التاريخ', 'رقم', 'المورد', 'الصنف', 'الكراتين', 'سعر الكرتونة', 'الإجمالي']];
    S.buys.forEach(function (d) {
      d.lines.forEach(function (l) {
        R.push([dt(d.ts), d.id, pname('s', d.sid), l.name, l.q, l.cp, l.t]);
      });
    });
  } else if (w == 'cust' || w == 'supp') {
    var k = w == 'cust' ? 'c' : 's';
    R = [['الاسم', 'الهاتف', 'إجمالي الفواتير', 'المسدد', 'المتبقي']].concat(
      (k == 'c' ? S.cust : S.supp).map(function (p) {
        var s = st(k, p.id);
        return [p.name, p.phone, s.tot, s.paid, s.bal];
      }),
    );
  } else
    R = [['التاريخ', 'البيان', 'وارد', 'صادر']].concat(
      S.tx.map(function (t) {
        return [dt(t.ts), t.note, t.type == 'in' ? t.amt : '', t.type == 'out' ? t.amt : ''];
      }),
    );
  dl(w + '.csv', csv(R));
}

function restore(el) {
  var fl = el.files[0];
  if (!fl) return;
  var r = new FileReader();
  r.onload = function () {
    try {
      var o = JSON.parse(r.result);
      if (!o.user || !o.items) throw 0;
      if (!confirm('سيتم استبدال البيانات الحالية. متابعة؟')) return;
      S = Object.assign(S, o);
      save();
      alert('تم الاسترجاع');
      render();
    } catch (e) {
      $('e').textContent = 'الملف غير صالح';
    }
  };
  r.readAsText(fl);
}

// ============================================================
// واتساب والإشعارات
// ============================================================
function waNum(p) {
  var d = String(p || '').replace(/\D/g, '');
  if (d.indexOf('00') == 0) d = d.slice(2);
  else if (d.charAt(0) == '0') d = '20' + d.slice(1);
  return d;
}

function wa(p, t) {
  var n = waNum(p);
  if (n.length < 8) {
    alert('رقم هاتف غير صالح أو غير مسجل');
    return;
  }
  window.open('https://wa.me/' + n + '?text=' + encodeURIComponent(t), '_blank');
}

function notify(t, b) {
  if (!('Notification' in window) || Notification.permission != 'granted') return;
  var fb = function () {
    try {
      new Notification(t, { body: b });
    } catch (e) {}
  };
  if (navigator.serviceWorker)
    navigator.serviceWorker
      .getRegistration()
      .then(function (r) {
        if (r) r.showNotification(t, { body: b, icon: 'assets/icon-192.png', tag: t });
        else fb();
      })
      .catch(fb);
  else fb();
}

function checkNotif() {
  if (!auth || !S.set.notif || S.set.last == new Date().toDateString()) return;
  var L = dueList(),
    lw = S.items.filter(function (i) {
      return i.min > 0 && i.stock <= i.min;
    });
  S.set.last = new Date().toDateString();
  save();
  if (L.length)
    notify(
      '🔔 تذكير السداد',
      L.length +
        ' عميل عليهم مبالغ مستحقة: ' +
        L.slice(0, 3)
          .map(function (r) {
            return r.c.name;
          })
          .join('، '),
    );
  if (lw.length)
    notify(
      '⚠ نقص مخزون',
      lw
        .slice(0, 4)
        .map(function (i) {
          return i.name;
        })
        .join('، '),
    );
}

function enNotif() {
  if (!('Notification' in window)) {
    alert('المتصفح لا يدعم الإشعارات');
    return;
  }
  Notification.requestPermission().then(function (p) {
    S.set.notif = p == 'granted';
    S.set.last = '';
    save();
    if (p == 'granted') notify('ماركت المودة', 'تم تفعيل الإشعارات ✅');
    else alert('تم رفض الإذن. فعّله من إعدادات المتصفح');
    setV();
  });
}

function offNotif() {
  S.set.notif = false;
  save();
  setV();
}

// ============================================================
// المظهر (دارك مود) وتثبيت التطبيق
// ============================================================
function curTheme() {
  try {
    return localStorage.getItem('mw_theme') || 'auto';
  } catch (e) {
    return 'auto';
  }
}

function setTheme(t) {
  try {
    localStorage.setItem('mw_theme', t);
  } catch (e) {}
  if (t == 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

function themeNext() {
  var d = document.documentElement.getAttribute('data-theme'),
    dk = d ? d == 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(dk ? 'light' : 'dark');
}

function inst() {
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
    alert('التطبيق مثبت بالفعل');
    return;
  }
  if (dp) {
    dp.prompt();
    dp.userChoice.then(function () {
      dp = null;
    });
    return;
  }
  alert(
    /iphone|ipad|ipod/i.test(navigator.userAgent)
      ? 'على آيفون: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»'
      : 'من قائمة المتصفح (⋮) اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»',
  );
}

// ============================================================
// التشغيل (Init)
// ============================================================
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  dp = e;
});
window.addEventListener('appinstalled', function () {
  dp = null;
});
if ('serviceWorker' in navigator && location.protocol.indexOf('http') == 0)
  navigator.serviceWorker.register('sw.js').catch(function () {});
setTheme(curTheme());
setInterval(checkNotif, 20000);
render();
