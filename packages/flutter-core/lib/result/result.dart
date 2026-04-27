sealed class Result<T, E> {
  const Result();
  factory Result.ok(T value) = Ok<T, E>;
  factory Result.err(E error) = Err<T, E>;

  bool get isOk => this is Ok<T, E>;
  bool get isErr => this is Err<T, E>;

  T get value => (this as Ok<T, E>).value;
  E get error => (this as Err<T, E>).error;

  R fold<R>(R Function(T value) onOk, R Function(E error) onErr) =>
      switch (this) {
        Ok(:final value) => onOk(value),
        Err(:final error) => onErr(error),
      };

  Result<R, E> map<R>(R Function(T value) transform) => switch (this) {
        Ok(:final value) => Ok(transform(value)),
        Err(:final error) => Err(error),
      };

  Result<T, R> mapErr<R>(R Function(E error) transform) => switch (this) {
        Ok(:final value) => Ok(value),
        Err(:final error) => Err(transform(error)),
      };
}

final class Ok<T, E> extends Result<T, E> {
  const Ok(this.value);
  @override
  final T value;
}

final class Err<T, E> extends Result<T, E> {
  const Err(this.error);
  @override
  final E error;
}
