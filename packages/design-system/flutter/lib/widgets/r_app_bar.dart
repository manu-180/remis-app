import 'package:flutter/material.dart';

/// RAppBar — translucent app bar with blur. TODO: implement full widget.
class RAppBar extends StatelessWidget implements PreferredSizeWidget {
  const RAppBar({super.key});

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) => AppBar();
}
