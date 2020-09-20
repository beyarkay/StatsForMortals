# The Multivariate Normal Distribution

## Why the conditionals (Y|X=x) are normally distributed

## Connection between eigenthings, ellipses and correlation
* The direction of the axes of the ellipse are the eigenvectors, 
* The size of the axes of the ellipse are sqrt(\lambda_i * \chi^2_{p,\alpha}) 
for the ith eigenvalue (not sure what p is though).
    * reference: [Geometry of the Multivariate Normal Distribution](https://online.stat.psu.edu/stat505/lesson/4/4.6)
* Start with the contour plot visualisation
* Quick recap on drawing ellipses with

## Higher dimensional visualisations with contour plots

## What is the Cholsky decomposition, really?

## Polar Coordinates parameterisation to explain ellipses?
\[
(x, y) = r \dot (cos(\theta), sin(\theta)) \dot L + (\mu_x, \mu_y)
\]
Where L is the cholsky decomposition

## Derivation


## References
[Visualizing Diagonalization & Eigenbases](https://www.youtube.com/watch?v=EJG6gBeVdfw)
 
## To read through
[USEFUL FACTS ABOUT GAUSSIANS](https://upload.wikimedia.org/wikipedia/commons/a/a2/Cumulative_function_n_dimensional_Gaussians_12.2013.pdf)
* [intuition behind conditional Gaussian distributions](https://stats.stackexchange.com/questions/71260/what-is-the-intuition-behind-conditional-gaussian-distributions)
    * Also good for ellipses

* Include something about solving d/d{exponential bit} to get the mean, 
but this is funky if you have rho!=0. When rho<>0, this gives you two equations 
and two unknowns which you can solve for. But the geometric interpretation is that 
the two equations you get, mu_x = something of mu_y and mu_y = something of mu_x give 
you the mean of the marginal distribution of that BVN, at a certain x or y value.
    * Question: are the two equations for mu_x, mu_y somehow related to the line 
    that `y=rho*x` draws across the plot of the BVN?
* Instead of a full 3D plot, for now just get the MVP out:
    * 3 plots. first is a top-down color/contour plot of the BVN
    * Two others, each to show the marginal distributions. one to the right and one 
    to the left.


3D
* Conditional Distros
* Bivariate Normal?
    * Either with a wiremesh, or with density dots
