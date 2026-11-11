const statuses = ['Reported', 'Assigned', 'In progress', 'Resolved', 'Closed'];
const routing = { Electrical: 'Electrical', Plumbing: 'Plumbing', 'Wi-Fi': 'IT Services', Cleanliness: 'Housekeeping', Furniture: 'Facilities', Safety: 'Campus Safety', Other: 'Facilities' };
const departments = [...new Set(Object.values(routing))];
const storageKey = 'smartfix-elp2-v1';
const seed = [
  { id: 'SF-DEMO1', title: 'Wi-Fi drops during lab sessions', category: 'Wi-Fi', location: 'Computing Lab', description: 'The connection drops on several workstations.', department: 'IT Services', status: 'In progress', sample: true },
  { id: 'SF-DEMO2', title: 'Leaking tap near the cafeteria', category: 'Plumbing', location: 'Cafeteria wash area', description: 'The tap drips continuously after closing.', department: 'Plumbing', status: 'Resolved', sample: true }
];
const byId = id => document.getElementById(id);
const reportForm = byId('report-form');
let tickets = seed;
try {
  tickets = JSON.parse(localStorage.getItem(storageKey)) ?? seed;
} catch {
  byId('message').textContent = 'Saved reports could not be loaded.';
}
function commit(next, message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    byId('message').textContent = 'Could not save this change. Browser storage may be full or disabled.';
    return false;
  }
  tickets = next;
  byId('message').textContent = message;
  renderLists();
  return true;
}
function update(ticket, change, message) {
  return commit(tickets.map(item => item.id === ticket.id ? { ...item, ...change } : item), message);
}
function make(tag, content, className) {
  const element = document.createElement(tag);
  if (content) element.textContent = content;
  if (className) element.className = className;
  return element;
}
function selectField(label, values, selected) {
  const wrapper = make('label', label);
  const select = make('select');
  values.forEach(value => select.add(new Option(value, value, false, value === selected)));
  wrapper.append(select);
  return { wrapper, select };
}
function staffActions(ticket, card) {
  if (statuses.indexOf(ticket.status) >= 3) return;
  const row = make('div', '', 'ticket-actions');
  const department = selectField('Department', departments, ticket.department);
  const save = make('button', 'Save department');
  save.addEventListener('click', () => update(ticket, { department: department.select.value }, 'Department updated.'));
  const next = statuses[statuses.indexOf(ticket.status) + 1];
  const advance = make('button', { Assigned: 'Assign ticket', 'In progress': 'Start repair', Resolved: 'Mark resolved' }[next], 'primary');
  advance.addEventListener('click', () => update(ticket, { department: department.select.value, status: next }, ticket.id + ' is now ' + next.toLowerCase() + '.'));
  row.append(department.wrapper, save, advance);
  card.append(row);
}
function feedbackActions(ticket, card) {
  if (ticket.status !== 'Resolved') return;
  const form = make('form');
  const rating = selectField('Rate the repair', ['Choose a rating', '5', '4', '3', '2', '1'], 'Choose a rating');
  rating.select.options[0].value = '';
  rating.select.required = true;
  const label = make('label', 'Feedback (optional)');
  const feedback = make('textarea');
  feedback.rows = 2;
  feedback.maxLength = 300;
  label.append(feedback);
  form.append(rating.wrapper, label, make('button', 'Confirm repair and close', 'primary'));
  form.addEventListener('submit', event => {
    event.preventDefault();
    update(ticket, { status: 'Closed', rating: rating.select.value, feedback: feedback.value.trim() }, ticket.id + ' closed. Thank you for verifying the fix.');
  });
  card.append(form);
}
function ticketCard(ticket, staff) {
  const card = make('article', '', 'ticket');
  const top = make('div', '', 'ticket-top');
  top.append(make('strong', ticket.id), make('span', ticket.status, 'pill'));
  if (ticket.sample) top.append(make('span', 'Sample report', 'pill'));
  card.append(top, make('h3', ticket.title), make('p', [ticket.location, ticket.category, ticket.department].join(' · ')), make('p', ticket.description));
  if (ticket.createdAt) card.append(make('p', 'Submitted ' + new Date(ticket.createdAt).toLocaleString()));
  if (ticket.photo) {
    const photo = make('img');
    photo.src = ticket.photo;
    photo.alt = 'Submitted issue photo';
    card.append(photo);
  }
  if (ticket.rating) card.append(make('p', 'Student rating ' + ticket.rating + '/5' + (ticket.feedback ? ' · ' + ticket.feedback : '')));
  if (staff) staffActions(ticket, card);
  else feedbackActions(ticket, card);
  return card;
}
function renderLists() {
  const query = byId('search').value.trim().toLowerCase();
  const filter = byId('filter').value;
  const student = tickets.filter(ticket => (ticket.id + ' ' + ticket.title).toLowerCase().includes(query));
  const staff = tickets.filter(ticket => filter === 'All statuses' || ticket.status === filter);
  byId('student-list').replaceChildren(...(student.length ? student.map(ticket => ticketCard(ticket, false)) : [make('p', 'No matching reports.')]));
  byId('staff-list').replaceChildren(...(staff.length ? staff.map(ticket => ticketCard(ticket, true)) : [make('p', 'No reports at this status.')]));
  const resolved = tickets.filter(ticket => ['Resolved', 'Closed'].includes(ticket.status)).length;
  byId('stats').replaceChildren(...[['Total reports', tickets.length], ['Active', tickets.length - resolved], ['Resolved or closed', resolved]].map(([label, count]) => {
    const stat = make('div');
    stat.append(make('strong', String(count)), make('span', label));
    return stat;
  }));
}
const room204 = new URLSearchParams(location.search).get('location') === 'room204';
function setLocation() {
  if (!room204) return;
  reportForm.elements.location.value = 'Block B · 2nd Floor · Room 204';
  byId('location-note').textContent = 'Location filled from the Room 204 QR link.';
}
function showPage() {
  const pages = ['overview', 'report', 'track', 'manage'];
  const requested = location.hash.slice(1);
  const active = pages.includes(requested) ? requested : 'overview';
  pages.forEach(page => {
    byId(page).hidden = page !== active;
    const link = document.querySelector('nav a[href="#' + page + '"]');
    if (page === active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
reportForm.addEventListener('submit', async event => {
  event.preventDefault();
  const error = byId('report-error');
  error.textContent = '';
  const values = new FormData(reportForm);
  const title = values.get('title').trim();
  const locationName = values.get('location').trim();
  const description = values.get('description').trim();
  const category = values.get('category');
  const file = values.get('photo');
  if (!title || !locationName || !description) {
    error.textContent = 'Enter a title, location and description.';
    return;
  }
  if (file.size && (file.size > 2_000_000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) {
    error.textContent = 'Choose a PNG, JPEG or WebP photo up to 2 MB.';
    return;
  }
  const submit = reportForm.querySelector('button');
  submit.disabled = true;
  try {
    const photo = file.size ? await readPhoto(file) : null;
    const id = 'SF-' + crypto.randomUUID().slice(0, 8).toUpperCase();
    const ticket = { id, title, category, location: locationName, description, photo, department: routing[category], status: 'Reported', createdAt: new Date().toISOString() };
    if (commit([ticket, ...tickets], 'Report submitted. Your ticket ID is ' + id + '.')) {
      reportForm.reset();
      setLocation();
      byId('search').value = id;
      renderLists();
      location.hash = 'track';
    }
  } catch {
    error.textContent = 'The photo could not be read. Choose another photo or submit without one.';
  } finally {
    submit.disabled = false;
  }
});
byId('search').addEventListener('input', renderLists);
byId('filter').addEventListener('change', renderLists);
window.addEventListener('hashchange', showPage);
setLocation();
renderLists();
showPage();
