$theme-mode: editorial;
$primary: #224466;
$accent: #ff6a3d;
$neutral: #d8e0ea;
$surface: #eef3f8;
$ink: #0f1720;

@mixin elevated-panel($radius: 24px, $padding: 1.25rem) {
  border-radius: $radius;
  padding: $padding;
  background: alpha(#ffffff, 0.76);
  box-shadow: 0 18px 54px alpha(#0f1720, 0.14);
}
