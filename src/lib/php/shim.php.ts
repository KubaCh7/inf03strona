// Nakladka mysqli_* (proceduralna i obiektowa) – zapytania ida do bazy warsztatu (sql.js) przez post_message_to_js.
export const MYSQLI_SHIM = String.raw`<?php
if (!function_exists('mysqli_connect')) {
  define('MYSQLI_ASSOC', 1); define('MYSQLI_NUM', 2); define('MYSQLI_BOTH', 3);
  function __p03_sql($op, $args) {
    $r = post_message_to_js(json_encode(['op' => $op] + $args));
    $d = json_decode($r, true);
    return is_array($d) ? $d : ['error' => 'Brak odpowiedzi bazy'];
  }
  class mysqli_result {
    public $num_rows = 0; public $field_count = 0; private $rows; private $cols; private $i = 0;
    function __construct($cols, $rows) { $this->cols = $cols; $this->rows = $rows; $this->num_rows = count($rows); $this->field_count = count($cols); }
    function fetch_row() { if ($this->i >= count($this->rows)) return null; return $this->rows[$this->i++]; }
    function fetch_assoc() { $r = $this->fetch_row(); return $r === null ? null : array_combine($this->cols, $r); }
    function fetch_array($mode = MYSQLI_BOTH) {
      $r = $this->fetch_row(); if ($r === null) return null;
      if ($mode == MYSQLI_NUM) return $r;
      $a = array_combine($this->cols, $r); if ($mode == MYSQLI_ASSOC) return $a;
      $out = []; foreach ($r as $k => $v) { $out[$k] = $v; $out[$this->cols[$k]] = $v; } return $out;
    }
    function fetch_object() { $a = $this->fetch_assoc(); return $a === null ? null : (object)$a; }
    function fetch_all($mode = MYSQLI_NUM) { $o = []; while (($r = $this->fetch_array($mode)) !== null) $o[] = $r; return $o; }
    function data_seek($n) { $this->i = $n; return true; }
    function free() {} function close() {}
  }
  class mysqli {
    public $error = ''; public $errno = 0; public $connect_error = null; public $connect_errno = 0; public $affected_rows = 0; public $insert_id = 0;
    function __construct($host = 'localhost', $user = 'root', $pass = '', $db = '') { }
    function select_db($db) { return true; }
    function set_charset($c) { return true; }
    function query($sql) {
      $d = __p03_sql('query', ['sql' => $sql]);
      if (isset($d['error'])) { $this->error = $d['error']; $this->errno = 1064; trigger_error('mysqli: ' . $d['error'], E_USER_WARNING); return false; }
      $this->error = ''; $this->errno = 0; $this->affected_rows = $d['changes'] ?? 0; $this->insert_id = $d['lastId'] ?? 0;
      if (isset($d['cols'])) return new mysqli_result($d['cols'], $d['rows']);
      return true;
    }
    function real_escape_string($s) { return str_replace(["\\", "'", '"', "\0", "\n", "\r"], ["\\\\", "\\'", '\\"', "\\0", "\\n", "\\r"], $s); }
    function escape_string($s) { return $this->real_escape_string($s); }
    function close() { return true; }
  }
  function mysqli_connect($h = 'localhost', $u = 'root', $p = '', $db = '') { return new mysqli($h, $u, $p, $db); }
  function mysqli_select_db($c, $db) { return true; }
  function mysqli_set_charset($c, $cs) { return true; }
  function mysqli_query($c, $sql) { return $c->query($sql); }
  function mysqli_fetch_row($r) { return $r ? $r->fetch_row() : null; }
  function mysqli_fetch_assoc($r) { return $r ? $r->fetch_assoc() : null; }
  function mysqli_fetch_array($r, $m = MYSQLI_BOTH) { return $r ? $r->fetch_array($m) : null; }
  function mysqli_fetch_object($r) { return $r ? $r->fetch_object() : null; }
  function mysqli_fetch_all($r, $m = MYSQLI_NUM) { return $r ? $r->fetch_all($m) : []; }
  function mysqli_num_rows($r) { return $r ? $r->num_rows : 0; }
  function mysqli_num_fields($r) { return $r ? $r->field_count : 0; }
  function mysqli_affected_rows($c) { return $c->affected_rows; }
  function mysqli_insert_id($c) { return $c->insert_id; }
  function mysqli_error($c) { return $c->error; }
  function mysqli_errno($c) { return $c->errno; }
  function mysqli_connect_error() { return null; }
  function mysqli_connect_errno() { return 0; }
  function mysqli_real_escape_string($c, $s) { return $c->real_escape_string($s); }
  function mysqli_escape_string($c, $s) { return $c->real_escape_string($s); }
  function mysqli_data_seek($r, $n) { return $r->data_seek($n); }
  function mysqli_free_result($r) {}
  function mysqli_close($c) { return true; }
}
`;
