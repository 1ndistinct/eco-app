# Golang Style Guide

`services/app/` uses this guide for new and changed Go code. Apply it incrementally when touching legacy code rather than widening a change only for style cleanup.

## References

- [https://github.com/uber-go/guide/blob/master/style.md](https://github.com/uber-go/guide/blob/master/style.md)
- [https://go.dev/doc/effective_go](https://go.dev/doc/effective_go)
- [https://pthethanh.herokuapp.com/blog/articles/golang-name-conventions](https://pthethanh.herokuapp.com/blog/articles/golang-name-conventions)
- [https://github.com/golang/go/wiki/CodeReviewComments](https://github.com/golang/go/wiki/CodeReviewComments)
- [PEP20 (Zen Of Python)](https://peps.python.org/pep-0020/) while not relevant to Go, it contains some nice guidelines for all languages.
- [https://google.github.io/styleguide/go/guide](https://google.github.io/styleguide/go/guide)

## Errors

1. Use [fmt.Errorf](https://pkg.go.dev/fmt#Errorf).
2. Do not use `fmt.Errorf` without `%w`. This function is designed for wrapping, not for formatting or for replacing `errors.New`.
3. Use only lower case in errors without special symbols except `:`.
4. Prefer const string variables `semerr.Error` over global `var errSmth = errors.New("smth")`, because we should never override them even in tests:
   1. Avoid: `var EOF = errors.New("end of file")`
   2. Prefer: `const EOF semerr.Error = "end of file"`
5. Add clear context that describes the action and the place where `err` happened (if it is not clear):

   ```go
   fmt.Errorf("sql: execing insert: %w", err)
   fmt.Errorf("getting user: %w", err)
   // If it is happening twice, then define the place.
   fmt.Errorf("app: getting user: %w", err)
   ```

6. Prefer to use [semerr](https://github.com/hedhyw/semerr) in order to describe the type of `err`. It also helps to set the correct status code, and isolate the layers from implementation errors (neither `redis.ErrNil` nor `sql.ErrNoRows`, but `semerr.NotFoundError`). It is possible to override this wrapping on other layers.
7. Always handle `err`. If there are more than two errors, log one of them or use multierror pattern:

   ```go
   func writeFile() (err error) {
   	// ... defer func() { err = errors.Join(err, file.Close()) }()
   }
   ```

8. Return errors early.
9. Return values as the last line in function (see [Guard Clauses pattern](https://refactoring.guru/replace-nested-conditional-with-guard-clauses)).

## Variables

1. Prefer immutability, if the variable could be `const` than make it `const`. It helps to avoid mistaken mutations.
2. Naming:
   - [https://github.com/golang/go/wiki/CodeReviewComments#variable-names](https://github.com/golang/go/wiki/CodeReviewComments#variable-names)
   - [https://blog.devgenius.io/write-better-go-code-by-keeping-your-variable-names-short-13f404ac515c](https://blog.devgenius.io/write-better-go-code-by-keeping-your-variable-names-short-13f404ac515c)
   - [https://cs.opensource.google/go/go/+/refs/tags/go1.19.3:src/net/net.go;l=207](https://cs.opensource.google/go/go/+/refs/tags/go1.19.3:src/net/net.go;l=207)
   - [https://google.github.io/styleguide/go/guide](https://google.github.io/styleguide/go/guide)
3. Common shortcuts (to be continued, depends on context):

   | Name | Type |
   | --- | --- |
   | `th` | `*TestHelper` |
   | `tc` | `TestCase` |
   | `t` | `*testing.T` |
   | `b` | `*testing.B` |
   | `tb` | `testing.TB` |
   | `ctx` | `context.Context` |
   | `b` | `[]byte` |
   | `w` | `io.Writer` |
   | `w` | `http.ResponseWriter` for handler |
   | `r` | `*http.Request` for handler |
   | `req` | `*http.Request` for client |
   | `resp` | `*http.Response` for client |
   | `ts` | `httptest.Server` |
   | `k, v` | loop over `map[K]V` |
   | `i, j, k` | loop index |
   | `tc` | test case in loop |
   | `mu` | `sync.Mutex` |
   | `db` | `*sql.DB` |
   | `es` | `*Essentials` |
   | `*` | receiver names |
   | `*` | godoc naming from examples |
4. Make sure variable names are readable, maybe add a comment?

## Interfaces

1. Do not place an interface near implementation.
2. Do not create an interface, if you do not have multiple implementations (`mock` is an implementation).
3. Place interface in the parent directory. Example:
   - `weather/weather.go` - interface/models here.
   - `weather/weatherfirst/weatherfirst.go` - the first implementation here.
   - `weather/weathersecond/weathersecond.go` - the second implementation here.

## Functions And Arguments

1. Avoid more than 3 arguments in function (not considering `ctx`, `t`).
2. Use the struct `Essentials` for multiple required arguments. The linter checks that all fields of the `Essentials` struct are set.
3. Return only 1 or 2 parameters, return a struct if you need to return more.
4. It is better to name return parameters because it improves documentation.
5. Avoid uncomfortably long lines. Reference: [https://github.com/golang/go/wiki/CodeReviewComments#line-length](https://github.com/golang/go/wiki/CodeReviewComments#line-length)
   - Avoid:

     ```go
     func (s SqlMstTeamsStore) UpdateOrganisation(ctx context.Context, tenantID string, orgData *model.MstOrganisation) (orgRes *model.MstOrganisation, err error) {
     ```

   - Prefer:

     ```go
     func (s SqlMstTeamsStore) UpdateOrganisation(
     	ctx context.Context,
     	tenantID string,
     	orgData *model.MstOrganisation,
     ) (*model.MstOrganisation, error) {
     	// Why? More readable, and helps to collaborate on code.
     }
     ```

6. Prefer to comment position arguments for function calls if it is not clear

   ```go
   mockCompany.On(
   	"GetByDeployment",
   	deployment,
   	true, // IsAdmin.
   ).Return(company, nil)
   ```

7. For multi-line statements prefer symmetric blocks:
   - Avoid:

     ```go
     Essentials{
     	Field1: field1,
     	Field2: field2}
     ```

   - Prefer:

     ```go
     Essentials{
     	Field1: field1,
     	Field2: field2,
     }
     ```

   - Exception:

     ```go
     // Short argument.
     assert.Equal(t,
     	model.ContentTypeJSON,
     	httpServerRequest.Header.Get(model.HeaderContentType),
     )
     ```

8. Do not combine function argument types. It helps to distinguish arguments by highlighting them in the IDE.
   - Avoid:

     ```go
     func(a, b int)
     ```

   - Prefer:

     ```go
     func(a int, b int)
     ```

9. Do not use naked return:
   - Avoid:

     ```go
     func DoSomething() (err error) {
     	err = action()
     	return
     }
     ```

   - Prefer:

     ```go
     func DoSomething() (err error) {
     	err = action()
     	return err
     }
     ```

## Method Receivers

See: [https://go.dev/doc/effective_go#methods](https://go.dev/doc/effective_go#methods)

When writing methods, the receivers should be either value or reference, not a mixture of both, and because methods often change their receiver, we prefer pointers. It makes the code more resilient to change, in addition to the memory implications as the code scales.

- Avoid:

  ```go
  type some struct {
  }

  func (s some) DoSomething() {
  	// ...
  }

  func (s *some) ChangeSomething() {
  	// ...
  }
  ```

- Prefer:

  ```go
  type some struct {
  }

  func (s *some) DoSomething() {
  	// ...
  }

  func (s *some) ChangeSomething() {
  	// ...
  }
  ```

## Comments

- Write comments: [Why programmers do not comment their code (idea)](https://everything2.com/index.pl?node_id=1709851&displaytype=printable).
- Write not what the code is doing but why.
- [Comments should be sentences](https://nedbatchelder.com/blog/201401/comments_should_be_sentences.html): Add dot at the end of the comment and a capital letter at the front.
- Prefer to write a comment on the previous line (except commenting arguments of function call).

  ```go
  a.Action() // Less preferable.

  // More preferable.
  a.Action()

  // Exception:
  a.Action(
  	a, // Description of A.
  	b, // Description of B.
  )
  ```

## Mst-server Exceptions

Reference: [https://developers.mattermost.com/contribute/more-info/server/style-guide/](https://developers.mattermost.com/contribute/more-info/server/style-guide/)

- Use camelCase for new consts.
- Avoid `ToJSON` methods.
- Use `userID` rather than `userId`.
- Avoid `model.AppError`, see this guide's error section.
- The name of any error variable must be `err` or prefixed with `err`. The name of any `*model.AppError` variable must be `appErr` or prefixed with `appErr`.
- Do not use pointers to slices.

We cannot fix all legacy, because it requires too much work. The codebase was taken from the big open source project.

### AppError

Mixing `appErr` and `err` (this happens frequently):

1. Requires to distinguish `assert.Err` and `assert.Nil`.
2. Brings a negative possibility of a `nil` `AppError` written in the `error` interface.

   ```go
   var err error = (*AppError)(nil)
   err != nil // True!
   ```

3. Invalid variable in the return/if statements:

   ```go
   data, err := io.Read(r)
   if err != nil {
   	return fmt.Errorf("reading: %w", err)
   }

   u, appErr := a.GetUser()
   if appErr != nil {
   	return err // Should be `appErr`, but not.
   }

   u, appErr = a.GetUser()
   if err != nil { // We need to check appErr.
   	return appErr
   }
   ```

Just using `*AppError`:

- not possible to wrap;
- very long;
- contains API-layer-specific information;
- not possible to mix with normal `err` without critical mistakes;
- we cannot use comparison `errors.Is(err, redis.ErrNil)`.

So it is better to avoid using `*AppError`, but if we need to use it, then we should name it as `appErr` (not `aerr`, `err`, or `errApp`). We have some adapters that help to avoid common mistakes:

```go
u, err := model.AErr(a.Store().GetUser()) // `err` has an `error` type here.
if err != nil {
	return fmt.Errorf("getting user: %w", err)
}

// See also:
err = model.AppErrorToError(appErr)

// If we want to convert `err` to `appErr` in api4 layer then we can use:
appErr := model.ErrorAppError(err)
```

## Tests

1. We should not have functions that access the internal state (reorganize your test or make unit test in the same package).
2. Do not use [os.Setenv](https://pkg.go.dev/os#Setenv), because it can influence other tests or use [t.Setenv](https://pkg.go.dev/testing#T.Setenv) without [t.Parallel](https://pkg.go.dev/testing#T.Parallel).
3. Use [t.Parallel](https://pkg.go.dev/testing#T.Parallel) whenever it is possible.
4. Try to clean up everything that influences other tests.
5. Prefer testing exported functionality.
6. Try to avoid mocks whenever possible because they could hide problems, and it is difficult to maintain code with mocks. Use mocks if it is uncomfortable to use full functionality in the test.
7. Use [httptest.NewServer](https://pkg.go.dev/net/http/httptest#example-NewTLSServer) to test HTTP clients.
8. Prefer `t.Cleanup` over `defer`. It is really useful for helpers.
9. Call `tb.Helper` at the beginning of the helper.
10. Use underscores instead of spaces in the names of tests. This makes searching for them easier, as Golang will add underscore in test output.

    ```go
    t.Run("ook ook eek", func(t *testing.T) { /* ... */ }) // Bad, do not do this! Except BDD tests.
    t.Run("ook_ook_eek", func(t *testing.T) { /* ... */ }) // Good.
    ```
